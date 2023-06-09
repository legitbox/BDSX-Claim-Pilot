"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFormattedTimeString = exports.getXuidFromLoginPkt = exports.getNumOfBlocksInBox = exports.organizeCorners = exports.isBoxOverlapping = exports.BoxCorners = exports.getPlayersFromXuids = exports.SquareCorners = exports.generateLine = exports.generateSquare = exports.HeightLevel = exports.generateBox = exports.createWand = exports.isWand = exports.deleteItemFromArray = exports.isPointInBox = exports.generateID = void 0;
const inventory_1 = require("bdsx/bds/inventory");
const configManager_1 = require("./configManager");
const SerializableVec3_1 = require("./SerializableTypes/SerializableVec3");
const launcher_1 = require("bdsx/launcher");
const nbt_1 = require("bdsx/bds/nbt");
const base_64_1 = require("base-64");
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
    if (configManager_1.CONFIG.wandName)
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
// Kind of messy, maybe a better way to do this but it should be fast enough to not have any performance issue
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
function isBoxOverlapping(boxOne, boxTwo) {
    return isPointInBox(boxTwo.bottom.cornerOne, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.bottom.cornerTwo, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.bottom.cornerThree, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.bottom.cornerFour, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerOne, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerTwo, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerThree, boxOne.bottom.cornerOne, boxOne.top.cornerFour) ||
        isPointInBox(boxTwo.top.cornerFour, boxOne.bottom.cornerOne, boxOne.top.cornerFour);
}
exports.isBoxOverlapping = isBoxOverlapping;
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
        if (i === 3) {
            name = partTwoData.extraData.displayName;
        }
        if (Object.keys(partOneData).includes('extraData') && Object.keys(partOneData.extraData).includes('XUID')) {
            xuid = partOneData.extraData.XUID;
        }
        if (Object.keys(partTwoData).includes('extraData')) {
            xuid = partTwoData.extraData.XUID;
        }
    }
    if (xuid === undefined) {
        throw 'XUID WASN\'T IN LOGIN';
    }
    if (name === undefined) {
        throw 'NAME WASN\'T IN LOGIN';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxrREFBNkM7QUFDN0MsbURBQXVDO0FBQ3ZDLDJFQUFzRTtBQUV0RSw0Q0FBNEM7QUFDNUMsc0NBQWlDO0FBRWpDLHFDQUErQjtBQUUvQixTQUFnQixVQUFVLENBQUMsTUFBYztJQUNyQyxNQUFNLFVBQVUsR0FBRyxnRUFBZ0UsQ0FBQztJQUNwRixJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFFWixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRSxFQUFFLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUN4QztJQUVELE9BQU8sRUFBRSxDQUFDO0FBQ2QsQ0FBQztBQVZELGdDQVVDO0FBRUQsU0FBZ0IsWUFBWSxDQUFDLEtBQWdCLEVBQUUsU0FBb0IsRUFBRSxTQUFvQjtJQUNyRixPQUFPLEtBQUssQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDO1FBQ25ELEtBQUssQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDO1FBQ2hELEtBQUssQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDekQsQ0FBQztBQUpELG9DQUlDO0FBRUQsU0FBZ0IsbUJBQW1CLENBQUMsSUFBUyxFQUFFLEtBQVk7SUFDdkQsT0FBTyxLQUFL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