// Way to generate IDs that dont look horrendous in a text editor
import {VectorXYZ} from "bdsx/common";
import {ItemStack} from "bdsx/bds/inventory";
import {CONFIG} from "./configManager";
import {SerializableVec3} from "./SerializableTypes/SerializableVec3";
import {ServerPlayer} from "bdsx/bds/player";
import {bedrockServer} from "bdsx/launcher";
import {NBT} from "bdsx/bds/nbt";
import {NativePointer} from "bdsx/core";
import {decode} from "base-64";

export function generateID(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        id += characters.charAt(randomIndex);
    }

    return id;
}

export function isPointInBox(point: VectorXYZ, cornerOne: VectorXYZ, cornerTwo: VectorXYZ) {
    return point.x >= cornerOne.x && point.x <= cornerTwo.x &&
        point.y >= cornerOne.y && point.y <= cornerTwo.y &&
        point.z >= cornerOne.z && point.z <= cornerTwo.z;
}

export function deleteItemFromArray(item: any, array: any[]) {
    return array.filter((v) => {
        return item !== v;
    })
}

export function isWand(item: ItemStack) {
    if (item.getName() !== CONFIG.wandItemId) {
        return false;
    }

    if (CONFIG.wandNbtEnabled) {
        const itemTag = item.save();
        return itemTag.tag !== undefined && itemTag.tag.isWand === 1;
    }

    if (CONFIG.wandTestByNameEnabled && item.getCustomName() !== CONFIG.wandName) {
        return false;
    }

    if (CONFIG.wandTestByLoreEnabled) {
        const itemLore = item.getCustomLore();
        if (CONFIG.wandLore.length !== itemLore.length) {
            return false;
        }

        if (
            !CONFIG.wandLore.every((line, index) => {
                return line === itemLore[index];
            })
        ) {
            return false;
        }
    }

    return true;
}

export function createWand() {
    const wandItem = ItemStack.constructWith(CONFIG.wandItemId);

    if (CONFIG.wandNameEnabled) {
        wandItem.setCustomName(CONFIG.wandName);
    }

    if (CONFIG.wandLoreEnabled) {
        wandItem.setCustomLore(CONFIG.wandLore);
    }

    if (CONFIG.wandNbtEnabled) {
        const wandItemTag = wandItem.save();
        if (wandItemTag.tag === undefined) {
            wandItemTag.tag = {};
        }

        wandItemTag.tag.isWand = NBT.int(1);

        wandItem.load(wandItemTag);
    }

    return wandItem;
}

// Kind of messy, maybe a better way to do this but it should be fast enough to not have any performance issue
export function generateBox(cornerOne: SerializableVec3, cornerTwo: SerializableVec3) {
    const boxCorners = new BoxCorners(cornerOne, cornerTwo);

    const bottom = generateSquare(boxCorners, HeightLevel.Bottom);
    const top = generateSquare(boxCorners, HeightLevel.Top);

    const sideOne = generateLine(boxCorners.bottom.cornerOne, boxCorners.top.cornerOne);
    const sideTwo = generateLine(boxCorners.top.cornerThree, boxCorners.bottom.cornerThree);
    const sideThree = generateLine(boxCorners.top.cornerTwo, boxCorners.bottom.cornerTwo);
    const sideFour = generateLine(boxCorners.top.cornerFour, boxCorners.bottom.cornerFour);

    return [
        ...bottom,
        ...top,
        ...sideOne,
        ...sideTwo,
        ...sideThree,
        ...sideFour,
    ];
}

export enum HeightLevel {
    Top,
    Bottom,
}

export function generateSquare(corners: BoxCorners, heightLevel: HeightLevel) {
    const cornerOne = heightLevel === HeightLevel.Bottom ? corners.bottom.cornerOne : corners.top.cornerOne;
    const cornerTwo = heightLevel === HeightLevel.Bottom ? corners.bottom.cornerTwo : corners.top.cornerTwo;
    const cornerThree = heightLevel === HeightLevel.Bottom ? corners.bottom.cornerThree : corners.top.cornerThree;
    const cornerFour = heightLevel === HeightLevel.Bottom ? corners.bottom.cornerFour : corners.top.cornerFour;

    const lineOne = generateLine(cornerOne, cornerThree);
    const lineTwo = generateLine(cornerTwo, cornerFour);
    const lineThree = generateLine(cornerFour, cornerThree);
    const lineFour = generateLine(cornerTwo, cornerOne);

    return [...lineOne, ...lineTwo, ...lineThree, ...lineFour];
}

export function generateLine(point1: SerializableVec3, point2: SerializableVec3) {
    const distance = point1.distanceTo(point2);
    const stepInterval = distance / CONFIG.visualiserLineDensity;

    const linePoints: SerializableVec3[] = [];

    for (let i = 0; i < CONFIG.visualiserLineDensity; i++) {
        linePoints.push(point1.moveToward(point2, stepInterval * i));
    }

    return linePoints;
}

export class SquareCorners {
    cornerOne: SerializableVec3;
    cornerTwo: SerializableVec3;
    cornerThree: SerializableVec3;
    cornerFour: SerializableVec3;

    constructor(cornerOne: SerializableVec3, cornerEight: SerializableVec3, heightLevel?: HeightLevel) {
        const y = heightLevel === HeightLevel.Bottom ? cornerOne.y : cornerEight.y;

        // -X/-Z
        this.cornerOne = new SerializableVec3({
            x: cornerOne.x,
            y: y,
            z: cornerOne.z,
        });

        // -X/+Z
        this.cornerTwo = new SerializableVec3({
            x: cornerOne.x,
            y: y,
            z: cornerEight.z
        });

        // +X/-Z
        this.cornerThree = new SerializableVec3({
            x: cornerEight.x,
            y: y,
            z: cornerOne.z
        });

        // +X/+Z
        this.cornerFour = new SerializableVec3({
            x: cornerEight.x,
            y: y,
            z: cornerEight.z
        });
    }
}

export function getPlayersFromXuids(xuids: string[]) {
    const players: ServerPlayer[] = [];

    for (const xuid of xuids) {
        const player = bedrockServer.level.getPlayerByXuid(xuid);

        if (player === null) {
            continue;
        }

        players.push(player);
    }

    return players;
}

export class BoxCorners {
    top: SquareCorners;
    bottom: SquareCorners;

    constructor(cornerOne: SerializableVec3, cornerEight: SerializableVec3) {
        this.top = new SquareCorners(cornerOne, cornerEight, HeightLevel.Top);
        this.bottom = new SquareCorners(cornerOne, cornerEight, HeightLevel.Bottom);
    }
}

export function isBoxOverlapping(boxOne: BoxCorners, boxTwo: BoxCorners) {
    return isPointInBox(boxTwo.bottom.cornerOne, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.bottom.cornerTwo, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.bottom.cornerThree, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.bottom.cornerFour, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerOne, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerTwo, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerThree, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerFour, boxOne.bottom.cornerOne, boxOne.top.cornerFour);
}

export function organizeCorners(pos1: SerializableVec3, pos2: SerializableVec3) {
    let lowestX;
    let highestX;
    if (pos1.x < pos2.x) {
        lowestX = pos1.x;
        highestX = pos2.x;
    } else {
        lowestX = pos2.x;
        highestX = pos1.x;
    }

    let lowestY;
    let highestY;
    if (pos1.y < pos2.y) {
        lowestY = pos1.y;
        highestY = pos2.y;
    } else {
        lowestY = pos2.y;
        highestY = pos1.y;
    }

    let lowestZ;
    let highestZ;
    if (pos1.z < pos2.z) {
        lowestZ = pos1.z;
        highestZ = pos2.z;
    } else {
        lowestZ = pos2.z;
        highestZ = pos1.z;
    }

    const cornerOne = new SerializableVec3({
        x: lowestX,
        y: lowestY,
        z: lowestZ,
    });

    const cornerTwo = new SerializableVec3({
        x: highestX + 0.9999,
        y: highestY + 0.9999,
        z: highestZ + 0.9999,
    });

    return {
        cornerOne,
        cornerTwo,
    }
}

export function getNumOfBlocksInBox(cornerOne: SerializableVec3, cornerTwo: SerializableVec3) {
    const width = Math.round(cornerTwo.x - cornerOne.x);
    const height = Math.round(cornerTwo.y - cornerOne.y);
    const length = Math.round(cornerTwo.z - cornerOne.z);

    return width * height * length;
}

export function getXuidFromLoginPkt(pkt: NativePointer): [string, string] | undefined {
    pkt.readVarInt(); // Reading packet id

    pkt.readInt32(); // Reading protocol

    pkt.readVarInt(); // Reading data length

    const chainDataLength = pkt.readInt32();
    if (chainDataLength <= 0) {
        return undefined;
    }

    const chainJsonStr = pkt.readString(chainDataLength);
    const chainData: { chain: string[] } = JSON.parse(chainJsonStr);


    let i = 0;

    let xuid: string | undefined = undefined;
    let name: string | undefined = undefined;

    for (const chain of chainData.chain) {
        i += 1;
        const parts = chain.split('.');
        const partOne = parts[0];
        const partTwo = parts[1];

        const decodedPartOne = decode(partOne);
        const decodedPartTwo = decode(partTwo);

        const partOneData = JSON.parse(decodedPartOne);
        const partTwoData = JSON.parse(decodedPartTwo);

        const partOneKeys = Object.keys(partOneData);
        const partTwoKeys = Object.keys(partTwoData);

        if (partOneKeys.includes("extraData")) {
            const extraDataKeys = Object.keys(partOneData.extraData);

            if (extraDataKeys.includes("XUID")) {
                xuid = partOneData.extraData.XUID;
            }

            if (extraDataKeys.includes("displayName")) {
                name = partOneData.extraData.displayName;
            }
        } else if (partTwoKeys.includes("extraData")) {
            const extraDataKeys = Object.keys(partTwoData.extraData);

            if (extraDataKeys.includes("XUID")) {
                xuid = partTwoData.extraData.XUID;
            }

            if (extraDataKeys.includes("displayName")) {
                name = partTwoData.extraData.displayName;
            }
        }
    }

    if (xuid === undefined) {
        return undefined;
    }

    if (name === undefined) {
        return undefined;
    }

    return [xuid, name];
}

export function createFormattedTimeString(time: number) {
    const days = Math.floor(time / 86_400_000);
    time -= days * 86_400_000;

    const hours = Math.floor(time / 3_600_000);
    time -= hours * 3_600_000;

    const minutes = Math.floor(time / 60_000);
    time -= minutes * 60_000;

    const seconds = Math.floor(time / 1000);

    let timeStr = '';

    if (days !== 0) {
        const unit = minutes === 1 ? 'day' : 'days';
        timeStr += `§e${days}§a ${unit}, `;
    }

    if (hours !== 0) {
        const unit = minutes === 1 ? 'hour' : 'hours';
        timeStr += `§e${hours}§a ${unit}, `;
    }

    if (minutes !== 0) {
        const unit = minutes === 1 ? 'minute' : 'minutes';
        timeStr += `§e${minutes}§a ${unit}, `;
    }

    if (seconds !== 0) {
        const unit = seconds === 1 ? 'second' : 'seconds';
        timeStr += `§e${seconds}§a ${unit}, `;
    }

    if (timeStr === '') {
        return '§aless than a second§r';
    }

    return timeStr.slice(0 ,timeStr.length - 2) + '§r';
}
