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
    build(isServer = false) {
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
            return (0, claim_1.registerNewClaim)(this.ownerXuid, this.name, this.pos1, this.pos2, this.dimensionId);
        }
    }
}
exports.ClaimBuilder = ClaimBuilder;
function triggerWandUse(pos, player) {
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
        const claim = builder.build(isServerClaim);
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