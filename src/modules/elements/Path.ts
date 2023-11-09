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

/** Base class for Path elements. Extends SizedElement with `operation` property and provides helper methods. */
export default class Path extends SizedElement
{
    operation: PathBoolOperation = PathBoolOperation.None;  // boolean operation to perform with previous path, if any
    protected readonly cache: PathCache = new PathCache();

    readonly layerRole: LayerRole = LayerRole.PathProducer;

    constructor(init?: Partial<Path> | any) {
        super(init);
        assignExistingProperties(this, init, 0);
    }

    /** Parses a string value into an `PathBoolOperation` enum type result and returns it, or PathBoolOperation.None if the value wasn't valid. */
    protected parsePathOperation(value: string) : PathBoolOperation {
        let ret = PathBoolOperation.None;
        let idx: number;
        if ((idx = PATH_BOOL_OPERATION_CHOICES.indexOf(value as PathBoolOperation)) > -1)
            ret = PATH_BOOL_OPERATION_CHOICES[idx];
        return ret;
    }

    /** Returns true if any properties were changed. */
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
