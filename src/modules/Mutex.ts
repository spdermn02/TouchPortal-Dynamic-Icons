
export class Mutex
{
    private queue: Array<any> = [];
    private locked: boolean = false;

    isLocked() { return this.locked; }

    acquire() {
        return new Promise<void>((resolve) => {
            if (this.locked) {
                this.queue.push(resolve);
            }
            else {
                this.locked = true;
                resolve();
            }
        });
    }

    release() {
        if (this.queue.length > 0)
            this.queue.shift()();
        else
            this.locked = false;
    }

    async runExclusive(callback: () => any | Promise<any>) {
        await this.acquire();
        try {
            return await callback();
        }
        finally {
            this.release();
        }
    }
}
