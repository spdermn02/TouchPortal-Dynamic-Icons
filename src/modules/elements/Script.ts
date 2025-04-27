
import * as vm from 'vm';
import * as canvas from '../types';
import * as elements from "./";
import * as geometry from '../geometry';
import * as utils from '../../utils';
import { Logger, logging } from '../logging';
import { LayerRole, ParseState } from '../'
import { Act, Str } from '../../utils/consts';
import { readFileSync } from 'fs';

import type { ILayerElement, IRenderable, IValuedElement } from '../interfaces';
import type { DynamicIcon, RenderContext2D } from '../'

type ContextObject = vm.Context & {
    logger: Logger,
    parentIcon: DynamicIcon | null | undefined,
    canvasContext: RenderContext2D | null,
    paintRectangle: geometry.Rectangle,
    scriptArgs: string,
};

/** This class will run a user-provided script in a (somemwhat) isolated Node VM environment.

The script will be provided with the current canvas context to draw onto and the drawing area rectangle.
An argument string can also be passed to the script.

The context (environment) the script runs in contains many of the classes & utilities used internally
(like `DOMMatrix`, `Canvas`, `loadImage()`, etc) as well as all the existing layer elements (`StyledText`, `RectanglePath`, etc).
A `logger` instance, `console` and `require` are also provided.

@internal
*/
export default class Script implements ILayerElement, IRenderable, IValuedElement
{
    /** Argument string to pass to the script's context object in `render()`. */
    args: string = "";

    #parent: WeakRef<DynamicIcon>;
    #source: string = "";
    #script: vm.Script | null = null;
    #context: vm.Context | null = null;
    #contextObj: ContextObject | null = null;
    readonly #contextOptions: vm.CreateContextOptions = {
        // microtaskMode: "afterEvaluate"
    };
    readonly #runOptions: vm.RunningScriptOptions = {
        timeout: 3000,
        breakOnSigint: true
    };
    readonly log: Logger;

    constructor(init: {parentIcon: DynamicIcon} & PartialDeep<Script>) {
        if (!init?.parentIcon)
            throw new Error("'parentIcon' property is required in `Script` constructor's init object argument.");
        this.#parent = new WeakRef(init.parentIcon);
        Object.assign(this, init);
        this.log = logging().getLogger(init.parentIcon.name);
        this.#contextOptions.name = `VM Context for ${init.parentIcon.name}`;
    }

    // ILayerElement
    /** @internal */
    readonly layerRole = LayerRole.Drawable;

    /** Returns true if no script source has been specified. */
    get isEmpty(): boolean { return !this.#source; }

    /** Path to script file. Relative paths are resolved against default file path configured in plugin settings, if any. */
    get source() { return this.#source; }
    set source(path: string) {
        this.setSource(path);
    }

    /** Get or set the script's timeout setting. This determines how long to wait for the script to complete before killing it. */
    get timeout() { return this.#runOptions.timeout!; }
    set timeout(ms: number) {
        if (ms > 0)
            this.#runOptions.timeout = ms;
    }

    get iconName() { return this.#parent.deref()?.name ?? ""; }

    // IValuedElement
    /** Sets/updates the script arguments ({@link args} property). */
    setValue(value: string) {
        this.args = value;
    }

    private setSource(src: string) {
        if (src)
            src = utils.qualifyFilepath(src);
        if (src !== this.#source) {
            this.#source = src;
            this.#script = null;
        }
    }

    private createContext() {
        // This object defines what is available to the script in its global context.
        this.#contextObj = {
            require, console,
            ...canvas, ...geometry,
            DI: { ...elements, ...utils },
            logger: this.log,
            parentIcon: null,
            canvasContext: null,
            paintRectangle: new geometry.Rectangle(),
            scriptArgs: "",
        }
        this.#context = vm.createContext(this.#contextObj, this.#contextOptions);
    }

    private getContext(): ContextObject {
        if (!this.#context)
            this.createContext();
        return this.#contextObj!;
    }

    private createScript() {
        try {
            const src = readFileSync(this.#source, { encoding: 'utf-8' });
            this.#script = new vm.Script(src, this.#source);
        }
        catch (e: any) {
            this.setSource("");  // reset path and script to null
            this.log.error(`Error loading or creating script from file "${this.#source}": ${e}`);
        }
        return !!this.#script;
    }

    loadFromActionData(state: ParseState): Script {
        const dr = state.asRecord(state.pos, Act.IconScript + Str.IdSep);
        if (dr.src != undefined)
            this.setSource(dr.src);
        if (dr.args != undefined)
            this.setValue(dr.args);
        if (dr.cache == "Off")
            this.#script = null;
        // console.dir(this);
        return this;
    }

    // IRenderable
    async render(ctx: RenderContext2D, rect: geometry.Rectangle) {
        if (!ctx || this.isEmpty)
            return;
        if (!this.#script && !this.createScript())
            return;

        const scriptCtx = this.getContext();
        scriptCtx.parentIcon = this.#parent.deref();
        scriptCtx.canvasContext = ctx;
        scriptCtx.paintRectangle.set(rect);
        scriptCtx.scriptArgs = this.args;

        ctx.save();
        // const start = process.hrtime.bigint();
        try {
            await this.#script!.runInContext(this.#context!, this.#runOptions);
        }
        catch (e: any) {
            this.log.error(e, e.stack);
        }
        // const end = process.hrtime.bigint();
        // this.log.debug(this.iconName, ((end - start) / 1_000n), "μs");
        ctx.restore();
        scriptCtx.parentIcon = null;     // don't store deref'd instance
        scriptCtx.canvasContext = null;  // or the context
        // console.dir(this.contextObj);

    }
}
