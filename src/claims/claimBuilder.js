"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelClaim = exports.CancelClaimResult = exports.stopBuilder = exports.getClaimBuilder = exports.triggerWandUse = exports.ClaimBuilder = exports.setPlayerServerBuilderState = exports.PlayerServerBuilderToggleResult = exports.isPlayerServerBuilder = exports.ClaimBuildFailReason = void 0;
const SerializableVec3_1 = require("../SerializableTypes/SerializableVec3");
const claim_1 = require("./claim");
const actor_1 = require("bdsx/bds/actor");
const utils_1 = require("../utils");
const claimBlocksManager_1 = require("./claimBlocksManager");
const configManager_1 = require("../configManager");
var ClaimBuildFailReason;
(function (ClaimBuildFailReason) {
    ClaimBuildFailReason[ClaimBuildFailReason["NoPos2"] = 0] = "NoPos2";
    ClaimBuildFailReason[ClaimBuildFailReason["NoName"] = 1] = "NoName";
    ClaimBuildFailReason[ClaimBuildFailReason["OverlappingClaim"] = 2] = "OverlappingClaim";
    ClaimBuildFailReason[ClaimBuildFailReason["InsufficientBlocks"] = 3] = "InsufficientBlocks";
    ClaimBuildFailReason[ClaimBuildFailReason["TooSmall"] = 4] = "TooSmall";
})(ClaimBuildFailReason = exports.ClaimBuildFailReason || (exports.ClaimBuildFailReason = {}));
const builders = new Map();
let serverClaimBuilders = [];
function isPlayerServerBuilder(playerXuid) {
    return serverClaimBuilders.includes(playerXuid);
}
exports.isPlayerServerBuilder = isPlayerServerBuilder;
var PlayerServerBuilderToggleResult;
(function (PlayerServerBuilderToggleResult) {
    PlayerServerBuilderToggleResult[PlayerServerBuilderToggleResult["Success"] = 0] = "Success";
    PlayerServerBuilderToggleResult[PlayerServerBuilderToggleResult["AlreadyBuildingClaim"] = 1] = "AlreadyBuildingClaim";
    PlayerServerBuilderToggleResult[PlayerServerBuilderToggleResult["AlreadyBuilder"] = 2] = "AlreadyBuilder";
    PlayerServerBuilderToggleResult[PlayerServerBuilderToggleResult["AlreadyNotBuilder"] = 3] = "AlreadyNotBuilder";
})(PlayerServerBuilderToggleResult = exports.PlayerServerBuilderToggleResult || (exports.PlayerServerBuilderToggleResult = {}));
function setPlayerServerBuilderState(playerXuid, enabled) {
    if (builders.has(playerXuid)) {
        return PlayerServerBuilderToggleResult.AlreadyBuildingClaim;
    }
    if (enabled) {
        if (!isPlayerServerBuilder(playerXuid)) {
            serverClaimBuilders.push(playerXuid);
            return PlayerServerBuilderToggleResult.Success;
        }
        else {
            return PlayerServerBuilderToggleResult.AlreadyBuilder;
        }
    }
    else {
        let didRemove = false;
        serverClaimBuilders = serverClaimBuilders.filter((value) => {
            let isRemoving = value === playerXuid;
            if (isRemoving) {
                didRemove = true;
            }
            return !isRemoving;
        });
        if (didRemove) {
            return PlayerServerBuilderToggleResult.Success;
        }
        else {
            return PlayerServerBuilderToggleResult.AlreadyNotBuilder;
        }
    }
}
exports.setPlayerServerBuilderState = setPlayerServerBuilderState;
class ClaimBuilder {
    constructor(ownerXuid, pos, dimensionId) {
        let pos1;
        if (pos instanceof SerializableVec3_1.SerializableVec3) {
            pos1 = pos;
        }
        else {
            pos1 = new SerializableVec3_1.SerializableVec3(pos);
        }
        this.ownerXuid = ownerXuid;
        this.pos1 = pos1;
        this.dimensionId = dimensionId;
    }
    setName(name) {
        this.name = name;
        return this;
    }
    setPos2(pos) {
        let pos2;
        if (pos instanceof SerializableVec3_1.SerializableVec3) {
            pos2 = pos;
        }
        else {
            pos2 = new SerializableVec3_1.SerializableVec3(pos);
        }
        this.pos2 = pos2;
        return this;
    }
    async build(isServer = false) {
        if (this.pos2 === undefined) {
            return ClaimBuildFailReason.NoPos2;
        }
        else if (this.name === undefined) {
            return ClaimBuildFailReason.NoName;
        }
        const { cornerOne, cornerTwo } = (0, utils_1.organizeCorners)(this.pos1, this.pos2);
        const box = new utils_1.BoxCorners(cornerOne, cornerTwo);
        if ((0, claim_1.isAnyClaimInBox)(box)) {
            return ClaimBuildFailReason.OverlappingClaim;
        }
        const blockCost = (0, utils_1.getNumOfBlocksInBox)(cornerOne, cornerTwo);
        const res = (0, claimBlocksManager_1.addUsedBlocksToPlayer)(this.ownerXuid, blockCost);
        if (!res && !isServer) {
            return ClaimBuildFailReason.InsufficientBlocks;
        }
        if (configManager_1.CONFIG.claimMinimumWidth !== -1 && !isServer) {
            const width = Math.round(cornerTwo.x - cornerOne.x);
            if (width < configManager_1.CONFIG.claimMinimumWidth) {
                return ClaimBuildFailReason.TooSmall;
            }
        }
        if (configManager_1.CONFIG.claimMinimumLength !== -1 && !isServer) {
            const length = Math.round(cornerTwo.z - cornerOne.z);
            if (length < configManager_1.CONFIG.claimMinimumLength) {
                return ClaimBuildFailReason.TooSmall;
            }
        }
        if (configManager_1.CONFIG.claimMinimumHeight !== -1 && !isServer) {
            const height = Math.round(cornerTwo.y - cornerOne.y);
            if (height < configManager_1.CONFIG.claimMinimumHeight) {
                return ClaimBuildFailReason.TooSmall;
            }
        }
        if (configManager_1.CONFIG.claimMinimumBlocks !== -1 && !isServer) {
            if (blockCost < configManager_1.CONFIG.claimMinimumBlocks) {
                return ClaimBuildFailReason.TooSmall;
            }
        }
        if (isServer) {
            return (0, claim_1.registerNewServerClaim)(this.name, this.pos1, this.pos2, this.dimensionId);
        }
        else {
            return await (0, claim_1.registerNewClaim)(this.ownerXuid, this.name, this.pos1, this.pos2, this.dimensionId);
        }
    }
}
exports.ClaimBuilder = ClaimBuilder;
async function triggerWandUse(pos, player) {
    const dimensionId = player.getDimensionId();
    const overlappedClaim = (0, claim_1.getClaimAtPos)(pos, dimensionId);
    const playerXuid = player.getXuid();
    const isServerClaim = isPlayerServerBuilder(playerXuid);
    let canPlaceInDimension;
    switch (dimensionId) {
        case actor_1.DimensionId.Overworld:
            canPlaceInDimension = configManager_1.CONFIG.allowedClaimDimension.Overworld;
            break;
        case actor_1.DimensionId.Nether:
            canPlaceInDimension = configManager_1.CONFIG.allowedClaimDimension.Nether;
            break;
        case actor_1.DimensionId.TheEnd:
            canPlaceInDimension = configManager_1.CONFIG.allowedClaimDimension.End;
            break;
        default:
            canPlaceInDimension = false;
            break;
    }
    if (!canPlaceInDimension && !isServerClaim) {
        player.sendMessage('§cClaims are not allowed in this dimension!');
        return;
    }
    if (overlappedClaim !== undefined) {
        // Already a claim at that spot!
        player.sendMessage('§cThat block overlaps an already existing claim!');
        return;
    }
    const claimXuid = isServerClaim ? "SERVER" : playerXuid;
    let availableBlocks;
    if (!isServerClaim) {
        availableBlocks = (0, claimBlocksManager_1.getPlayerFreeBlocks)(claimXuid);
        if (availableBlocks <= 0) {
            player.sendMessage('§cYou dont have any free blocks!');
            return;
        }
    }
    let builder = builders.get(playerXuid);
    if (builder === undefined) {
        builder = new ClaimBuilder(claimXuid, pos, dimensionId);
        if (isServerClaim) {
            builder.setName(`Server Claim`);
        }
        else {
            builder.setName(`${player.getName()}'s claim`);
        }
        player.sendMessage(`§aFirst pos selected! (${pos.x}, ${pos.y}, ${pos.z})`);
        builders.set(playerXuid, builder);
        return;
    }
    else {
        builder.setPos2(pos);
        const claim = await builder.build(isServerClaim);
        if (!(claim instanceof claim_1.Claim)) {
            switch (claim) {
                case undefined:
                    // Player should have already been sent message from event about claim creation failing
                    break;
                case ClaimBuildFailReason.NoName:
                    player.sendMessage('§cA name needs to be specified!');
                    break;
                case ClaimBuildFailReason.NoPos2:
                    player.sendMessage('§cNo pos2 set yet!');
                    break;
                case ClaimBuildFailReason.OverlappingClaim:
                    player.sendMessage('§cThat block makes the claim overlap another!');
                    break;
                case ClaimBuildFailReason.InsufficientBlocks:
                    const { cornerOne, cornerTwo } = (0, utils_1.organizeCorners)(builder.pos1, builder.pos2);
                    const blockCost = (0, utils_1.getNumOfBlocksInBox)(cornerOne, cornerTwo);
                    player.sendMessage(`§cThat block makes the claim too big!\n(You have §a${availableBlocks}§c and you need §a${blockCost}§c)`);
                    break;
                case ClaimBuildFailReason.TooSmall:
                    player.sendMessage('§cThat claim would be too small!');
                    break;
            }
            builders.delete(playerXuid);
            return;
        }
        if (isServerClaim) {
            player.sendMessage(`§aServer claim created!`);
            builders.delete(playerXuid);
            return;
        }
        else {
            const { cornerOne, cornerTwo } = (0, utils_1.organizeCorners)(builder.pos1, builder.pos2);
            const blockCost = (0, utils_1.getNumOfBlocksInBox)(cornerOne, cornerTwo);
            player.sendMessage(`§aClaim created! You used §e${blockCost}§a blocks, you have §e${(0, claimBlocksManager_1.getPlayerFreeBlocks)(playerXuid)}§a blocks remaining!`);
            builders.delete(playerXuid);
        }
    }
}
exports.triggerWandUse = triggerWandUse;
function getClaimBuilder(xuid) {
    return builders.get(xuid);
}
exports.getClaimBuilder = getClaimBuilder;
function stopBuilder(xuid) {
    builders.delete(xuid);
}
exports.stopBuilder = stopBuilder;
var CancelClaimResult;
(function (CancelClaimResult) {
    CancelClaimResult[CancelClaimResult["Success"] = 0] = "Success";
    CancelClaimResult[CancelClaimResult["NotABuilder"] = 1] = "NotABuilder";
})(CancelClaimResult = exports.CancelClaimResult || (exports.CancelClaimResult = {}));
function cancelClaim(xuid) {
    const builder = getClaimBuilder(xuid);
    if (builder === undefined) {
        return CancelClaimResult.NotABuilder;
    }
    stopBuilder(xuid);
    return CancelClaimResult.Success;
}
exports.cancelClaim = cancelClaim;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1CdWlsZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1CdWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRFQUF1RTtBQUN2RSxtQ0FBd0c7QUFDeEcsMENBQTJDO0FBSTNDLG9DQUEwRTtBQUMxRSw2REFBZ0Y7QUFDaEYsb0RBQXdDO0FBRXhDLElBQVksb0JBTVg7QUFORCxXQUFZLG9CQUFvQjtJQUM1QixtRUFBTSxDQUFBO0lBQ04sbUVBQU0sQ0FBQTtJQUNOLHVGQUFnQixDQUFBO0lBQ2hCLDJGQUFrQixDQUFBO0lBQ2xCLHVFQUFRLENBQUE7QUFDWixDQUFDLEVBTlcsb0JBQW9CLEdBQXBCLDRCQUFvQixLQUFwQiw0QkFBb0IsUUFNL0I7QUFFRCxNQUFNLFFBQVEsR0FBOEIsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUN0RCxJQUFJLG1CQUFtQixHQUFhLEVBQUUsQ0FBQztBQUV2QyxTQUFnQixxQkFBcUIsQ0FBQyxVQUFrQjtJQUNwRCxPQUFPLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwRCxDQUFDO0FBRkQsc0RBRUM7QUFFRCxJQUFZLCtCQUtYO0FBTEQsV0FBWSwrQkFBK0I7SUFDdkMsMkZBQU8sQ0FBQTtJQUNQLHFIQUFvQixDQUFBO0lBQ3BCLHlHQUFjLENBQUE7SUFDZCwrR0FBaUIsQ0FBQTtBQUNyQixDQUFDLEVBTFcsK0JBQStCLEdBQS9CLHVDQUErQixLQUEvQix1Q0FBK0IsUUFLMUM7QUFFRCxTQUFnQiwyQkFBMkIsQ0FBQyxVQUFrQixFQUFFLE9BQWdCO0lBQzVFLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUMxQixPQUFPLCtCQUErQixDQUFDLG9CQUFvQixDQUFDO0tBQy9EO0lBRUQsSUFBSSxPQUFPLEVBQUU7UUFDVCxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDcEMsbUJBQW1CLENBQUMsSUFB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