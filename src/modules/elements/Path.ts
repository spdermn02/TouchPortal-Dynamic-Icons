import { LayerRole, Path2D, PathBoolOperation, Size, TpActionDataRecord } from '..';
import { assignExistingProperties } from '../../utils';
import { PATH_BOOL_OPERATION_CHOICES } from '../../utils/consts';
import SizedElement from './SizedElement'

export class PathCache {
    path: Path2D | null = null;
    size: Size | null = null;
    clear() {
        this.path = null;
        this.size = null;
    }
    isDirtyForSize(size: Size) {
        return !this.path || !this.size || !this.size.fuzzyEquals(size);
    }
}

/** Base class for Path elements. Extends {@link SizedElement} with {@link operation} property and provides helper methods. */
export default class Path extends SizedElement
{
    /** Boolean operation to perform with previous path, if any.
        May be used by subclasses in their `IPathProducer#getPath` method to automatically combine with other paths. */
    operation: PathBoolOperation = PathBoolOperation.None;
    /** Cache for generated `Path3D` objects, possibly scaled to a particular size. May be used by subclasses.
        @see {@link clearCache}. */
    protected readonly cache: PathCache = new PathCache();

    readonly layerRole: LayerRole = LayerRole.PathProducer;

    constructor(init?: Partial<Path>) {
        super();
        assignExistingProperties(this, init, 1);
    }

    /** Clears the generated & cached Path2D object (if any). Some `Path` subclasses my not use the cache.
        Typically the cache management is handled automatically when relevant properties are modified. */
    clearCahe() {
        this.cache.clear();
    }

    /** Parses a string value into an `PathBoolOperation` enum type result and returns it, or PathBoolOperation.None if the value wasn't valid. */
    protected parsePathOperation(value: string) : PathBoolOperation {
        let ret = PathBoolOperation.None;
        let idx: number;
        if ((idx = PATH_BOOL_OPERATION_CHOICES.indexOf(value as PathBoolOperation)) > -1)
            ret = PATH_BOOL_OPERATION_CHOICES[idx];
        return ret;
    }

    /** @internal  Returns true if any parent `SizedElement` properties were changed. */
    protected loadFromDataRecord(dr: TpActionDataRecord): boolean
    {
        if (dr.operation) {
            this.operation = this.parsePathOperation(dr.operation);
            delete dr.operation;
        }
        return super.loadFromDataRecord(dr);
    }

    protected getCombinedPath(path: Path2D, pathStack?: Array<Path2D>) {
        // Possibly combine with previous layer using simple path operators like `complement()`, `union()`, etc.
        if (pathStack?.length && this.operation != PathBoolOperation.None) {
            if (this.operation != PathBoolOperation.Add)
                return path[this.operation](pathStack.pop()!);
            // path = new Path2D(path);
            path.addPath(pathStack.pop()!);
        }
        return path!;
    }
}
