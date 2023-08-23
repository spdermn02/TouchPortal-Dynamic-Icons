/*
    Simple logging framework.
    Copyright Maxim Paperno, all rights reserved.
    License: MIT
*/
import { ConsoleFormatter, IEndpointOptions } from "./";
import StreamEndpoint from './StreamEndpoint'

var instance: ConsoleEndpointImpl | null = null;

// Only one console output can exist per application so the actual implementation class
// is hidden behind a Proxy (below). Thus we implement the singleton pattern.
class ConsoleEndpointImpl extends StreamEndpoint
{
    readonly name: string = "Console";
    constructor(options?: IEndpointOptions) {
        if (!options)
            options = {};
        if (!options.formatter)
            options.formatter = new ConsoleFormatter();
        super(process.stdout, process.stderr, options);
    }

    get uid(): string { return "ConsoleEndpoint()"; }

    static instance(): ConsoleEndpointImpl {
        if (!instance)
            instance = new ConsoleEndpointImpl();
        return instance;
    }
}

// Proxy the implementation's constructor to ensure only one instance ever exists.
const ConsoleEndpoint = new Proxy(ConsoleEndpointImpl, {
    construct(target, args) {
        if (!instance)
            instance = new target(...args);
        return instance;
    }
});
export default ConsoleEndpoint;
