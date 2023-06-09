import {VectorXYZ} from "bdsx/common";

export class SerializableVec3 {
    x: number;
    y: number;
    z: number;

    constructor(vec: VectorXYZ) {
        this.x = vec.x;
        this.y = vec.y;
        this.z = vec.z;
    }

    static fromData(data: any) {
        return new SerializableVec3(data);
    }

    distanceTo(point: VectorXYZ) {
        const deltaX = point.x - this.x;
        const deltaY = point.y - this.y;
        const deltaZ = point.z - this.z;

        const distanceSquared = deltaX ** 2 + deltaY ** 2 + deltaZ ** 2;
        return Math.sqrt(distanceSquared);
    }

    moveToward(point: VectorXYZ, distance: number) {
        const direction = (new SerializableVec3({
            x: point.x - this.x,
            y: point.y - this.y,
            z: point.z - this.z,
        })).normalize();

        const deltaX = direction.x * distance;
        const deltaY = direction.y * distance;
        const deltaZ = direction.z * distance;

        return new SerializableVec3({
            x: this.x + deltaX,
            y: this.y + deltaY,
            z: this.z + deltaZ,
        });
    }

    normalize() {
        const magnitude = this.distanceTo({ x: 0, y: 0, z: 0 });
        return new SerializableVec3({
            x: this.x / magnitude,
            y: this.y / magnitude,
            z: this.z / magnitude,
        });
    }

    clone() {
        return new SerializableVec3(this);
    }
}