"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOfflinePlayerOp = exports.createFormattedTimeString = exports.getXuidFromLoginPkt = exports.getNumOfBlocksInBox = exports.organizeCorners = exports.BoxCorners = exports.getPlayersFromXuids = exports.SquareCorners = exports.generateLine = exports.generateSquare = exports.HeightLevel = exports.generateBox = exports.createWand = exports.isWand = exports.deleteItemFromArray = exports.isPointInBox = exports.generateID = void 0;
const inventory_1 = require("bdsx/bds/inventory");
const configManager_1 = require("./configManager");
const SerializableVec3_1 = require("./SerializableTypes/SerializableVec3");
const launcher_1 = require("bdsx/launcher");
const nbt_1 = require("bdsx/bds/nbt");
const base_64_1 = require("base-64");
const fs_1 = require("fs");
function generateID(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        id += characters.charAt(randomIndex);
    }
    return id;
}
exports.generateID = generateID;
function isPointInBox(point, cornerOne, cornerTwo) {
    return point.x >= cornerOne.x && point.x <= cornerTwo.x &&
        point.y >= cornerOne.y && point.y <= cornerTwo.y &&
        point.z >= cornerOne.z && point.z <= cornerTwo.z;
}
exports.isPointInBox = isPointInBox;
function deleteItemFromArray(item, array) {
    return array.filter((v) => {
        return item !== v;
    });
}
exports.deleteItemFromArray = deleteItemFromArray;
function isWand(item) {
    if (item.getName() !== configManager_1.CONFIG.wandItemId) {
        return false;
    }
    if (configManager_1.CONFIG.wandNbtEnabled) {
        const itemTag = item.save();
        return itemTag.tag !== undefined && itemTag.tag.isWand === 1;
    }
    if (configManager_1.CONFIG.wandTestByNameEnabled && item.getCustomName() !== configManager_1.CONFIG.wandName) {
        return false;
    }
    if (configManager_1.CONFIG.wandTestByLoreEnabled) {
        const itemLore = item.getCustomLore();
        if (configManager_1.CONFIG.wandLore.length !== itemLore.length) {
            return false;
        }
        if (!configManager_1.CONFIG.wandLore.every((line, index) => {
            return line === itemLore[index];
        })) {
            return false;
        }
    }
    return true;
}
exports.isWand = isWand;
function createWand() {
    const wandItem = inventory_1.ItemStack.constructWith(configManager_1.CONFIG.wandItemId);
    if (configManager_1.CONFIG.wandNameEnabled) {
        wandItem.setCustomName(configManager_1.CONFIG.wandName);
    }
    if (configManager_1.CONFIG.wandLoreEnabled) {
        wandItem.setCustomLore(configManager_1.CONFIG.wandLore);
    }
    if (configManager_1.CONFIG.wandNbtEnabled) {
        const wandItemTag = wandItem.save();
        if (wandItemTag.tag === undefined) {
            wandItemTag.tag = {};
        }
        wandItemTag.tag.isWand = nbt_1.NBT.int(1);
        wandItem.load(wandItemTag);
    }
    return wandItem;
}
exports.createWand = createWand;
// Kind of messy, maybe a better way to do this, but it should be fast enough to not have any performance issue
function generateBox(cornerOne, cornerTwo) {
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
exports.generateBox = generateBox;
var HeightLevel;
(function (HeightLevel) {
    HeightLevel[HeightLevel["Top"] = 0] = "Top";
    HeightLevel[HeightLevel["Bottom"] = 1] = "Bottom";
})(HeightLevel = exports.HeightLevel || (exports.HeightLevel = {}));
function generateSquare(corners, heightLevel) {
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
exports.generateSquare = generateSquare;
function generateLine(point1, point2) {
    const distance = point1.distanceTo(point2);
    const stepInterval = distance / configManager_1.CONFIG.visualiserLineDensity;
    const linePoints = [];
    for (let i = 0; i < configManager_1.CONFIG.visualiserLineDensity; i++) {
        linePoints.push(point1.moveToward(point2, stepInterval * i));
    }
    return linePoints;
}
exports.generateLine = generateLine;
class SquareCorners {
    constructor(cornerOne, cornerEight, heightLevel) {
        const y = heightLevel === HeightLevel.Bottom ? cornerOne.y : cornerEight.y;
        // -X/-Z
        this.cornerOne = new SerializableVec3_1.SerializableVec3({
            x: cornerOne.x,
            y: y,
            z: cornerOne.z,
        });
        // -X/+Z
        this.cornerTwo = new SerializableVec3_1.SerializableVec3({
            x: cornerOne.x,
            y: y,
            z: cornerEight.z
        });
        // +X/-Z
        this.cornerThree = new SerializableVec3_1.SerializableVec3({
            x: cornerEight.x,
            y: y,
            z: cornerOne.z
        });
        // +X/+Z
        this.cornerFour = new SerializableVec3_1.SerializableVec3({
            x: cornerEight.x,
            y: y,
            z: cornerEight.z
        });
    }
}
exports.SquareCorners = SquareCorners;
function getPlayersFromXuids(xuids) {
    const players = [];
    for (const xuid of xuids) {
        const player = launcher_1.bedrockServer.level.getPlayerByXuid(xuid);
        if (player === null) {
            continue;
        }
        players.push(player);
    }
    return players;
}
exports.getPlayersFromXuids = getPlayersFromXuids;
class BoxCorners {
    constructor(cornerOne, cornerEight) {
        this.top = new SquareCorners(cornerOne, cornerEight, HeightLevel.Top);
        this.bottom = new SquareCorners(cornerOne, cornerEight, HeightLevel.Bottom);
    }
}
exports.BoxCorners = BoxCorners;
/*export function isBoxOverlapping(boxOne: BoxCorners, boxTwo: BoxCorners) {
    return isPointInBox(boxTwo.bottom.cornerOne, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.bottom.cornerTwo, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.bottom.cornerThree, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.bottom.cornerFour, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerOne, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerTwo, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerThree, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerFour, boxOne.bottom.cornerOne, boxOne.top.cornerFour);
}*/
function organizeCorners(pos1, pos2) {
    let lowestX;
    let highestX;
    if (pos1.x < pos2.x) {
        lowestX = pos1.x;
        highestX = pos2.x;
    }
    else {
        lowestX = pos2.x;
        highestX = pos1.x;
    }
    let lowestY;
    let highestY;
    if (pos1.y < pos2.y) {
        lowestY = pos1.y;
        highestY = pos2.y;
    }
    else {
        lowestY = pos2.y;
        highestY = pos1.y;
    }
    let lowestZ;
    let highestZ;
    if (pos1.z < pos2.z) {
        lowestZ = pos1.z;
        highestZ = pos2.z;
    }
    else {
        lowestZ = pos2.z;
        highestZ = pos1.z;
    }
    const cornerOne = new SerializableVec3_1.SerializableVec3({
        x: lowestX,
        y: lowestY,
        z: lowestZ,
    });
    const cornerTwo = new SerializableVec3_1.SerializableVec3({
        x: highestX + 0.9999,
        y: highestY + 0.9999,
        z: highestZ + 0.9999,
    });
    return {
        cornerOne,
        cornerTwo,
    };
}
exports.organizeCorners = organizeCorners;
function getNumOfBlocksInBox(cornerOne, cornerTwo) {
    const width = Math.round(cornerTwo.x - cornerOne.x);
    const height = Math.round(cornerTwo.y - cornerOne.y);
    const length = Math.round(cornerTwo.z - cornerOne.z);
    return width * height * length;
}
exports.getNumOfBlocksInBox = getNumOfBlocksInBox;
function getXuidFromLoginPkt(pkt) {
    pkt.readVarInt(); // Reading packet id
    pkt.readInt32(); // Reading protocol
    pkt.readVarInt(); // Reading data length
    const chainDataLength = pkt.readInt32();
    if (chainDataLength <= 0) {
        return undefined;
    }
    const chainJsonStr = pkt.readString(chainDataLength);
    const chainData = JSON.parse(chainJsonStr);
    let i = 0;
    let xuid = undefined;
    let name = undefined;
    for (const chain of chainData.chain) {
        i += 1;
        const parts = chain.split('.');
        const partOne = parts[0];
        const partTwo = parts[1];
        const decodedPartOne = (0, base_64_1.decode)(partOne);
        const decodedPartTwo = (0, base_64_1.decode)(partTwo);
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
        }
        else if (partTwoKeys.includes("extraData")) {
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
exports.getXuidFromLoginPkt = getXuidFromLoginPkt;
function createFormattedTimeString(time) {
    const days = Math.floor(time / 86400000);
    time -= days * 86400000;
    const hours = Math.floor(time / 3600000);
    time -= hours * 3600000;
    const minutes = Math.floor(time / 60000);
    time -= minutes * 60000;
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
    return timeStr.slice(0, timeStr.length - 2) + '§r';
}
exports.createFormattedTimeString = createFormattedTimeString;
function getOfflinePlayerOp(xuid) {
    const permissionDataStr = (0, fs_1.readFileSync)("./permissions.json", 'utf-8');
    const permissionDatas = JSON.parse(permissionDataStr);
    for (const permissionData of permissionDatas) {
        if (permissionData.xuid !== xuid) {
            continue;
        }
        return permissionData.permission === "operator";
    }
    return false;
}
exports.getOfflinePlayerOp = getOfflinePlayerOp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxrREFBNkM7QUFDN0MsbURBQXVDO0FBQ3ZDLDJFQUFzRTtBQUV0RSw0Q0FBNEM7QUFDNUMsc0NBQWlDO0FBRWpDLHFDQUErQjtBQUMvQiwyQkFBZ0M7QUFFaEMsU0FBZ0IsVUFBVSxDQUFDLE1BQWM7SUFDckMsTUFBTSxVQUFVLEdBQUcsZ0VBQWdFLENBQUM7SUFDcEYsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBRVosS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM3QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEUsRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDeEM7SUFFRCxPQUFPLEVBQUUsQ0FBQztBQUNkLENBQUM7QUFWRCxnQ0FVQztBQUVELFNBQWdCLFlBQVksQ0FBQyxLQUFnQixFQUFFLFNBQW9CLEVBQUUsU0FBb0I7SUFDckYsT0FBTyxLQUFLLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQztRQUNuRCxLQUFLLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQztRQUNoRCxLQUFLLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQ3pELENBQUM7QUFKRCxvQ0FJQztBQUVELFNBQWdCLG1CQUFtQixDQUFDLElBQVMsRUFBRSxLQUFZO0lB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