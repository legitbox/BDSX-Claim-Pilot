"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelClaim = exports.CancelClaimResult = exports.stopBuilder = exports.getClaimBuilder = exports.triggerWandUse = exports.ClaimBuilder = exports.setPlayerServerBuilderState = exports.PlayerServerBuilderToggleResult = exports.isPlayerServerBuilder = exports.ClaimBuildFailReason = void 0;
const SerializableVec3_1 = require("../SerializableTypes/SerializableVec3");
const claim_1 = require("./claim");
const actor_1 = require("bdsx/bds/actor");
const utils_1 = require("../utils");
const claimBlocksManager_1 = require("./claimBlocksManager");
const configManager_1 = require("../configManager");
const claimCreatedEvent_1 = require("../events/claimCreatedEvent");
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
        if ((0, claim_1.isAnyClaimInBox)(box, this.dimensionId)) {
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
    const playerXuid = player.getXuid();
    const dimensionId = player.getDimensionId();
    const overlappedClaim = (0, claim_1.getClaimAtPos)(pos, dimensionId);
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
        const playerDimension = player.getDimensionId();
        if (playerDimension !== builder.dimensionId) {
            player.sendMessage(`§cYou cant make a claim across dimensions!`);
            return;
        }
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
            const extraData = (0, claimCreatedEvent_1.getExtraData)(claim.id);
            if (extraData.shouldSendDefaultMessage) {
                player.sendMessage(`§aClaim created! You used §e${blockCost}§a blocks, you have §e${(0, claimBlocksManager_1.getPlayerFreeBlocks)(playerXuid)}§a blocks remaining!`);
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1CdWlsZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1CdWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRFQUF1RTtBQUN2RSxtQ0FBd0c7QUFDeEcsMENBQTJDO0FBSTNDLG9DQUEwRTtBQUMxRSw2REFBZ0Y7QUFDaEYsb0RBQXdDO0FBQ3hDLG1FQUF5RDtBQUV6RCxJQUFZLG9CQU1YO0FBTkQsV0FBWSxvQkFBb0I7SUFDNUIsbUVBQU0sQ0FBQTtJQUNOLG1FQUFNLENBQUE7SUFDTix1RkFBZ0IsQ0FBQTtJQUNoQiwyRkFBa0IsQ0FBQTtJQUNsQix1RUFBUSxDQUFBO0FBQ1osQ0FBQyxFQU5XLG9CQUFvQixHQUFwQiw0QkFBb0IsS0FBcEIsNEJBQW9CLFFBTS9CO0FBRUQsTUFBTSxRQUFRLEdBQThCLElBQUksR0FBRyxFQUFFLENBQUM7QUFDdEQsSUFBSSxtQkFBbUIsR0FBYSxFQUFFLENBQUM7QUFFdkMsU0FBZ0IscUJBQXFCLENBQUMsVUFBa0I7SUFDcEQsT0FBTyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEQsQ0FBQztBQUZELHNEQUVDO0FBRUQsSUFBWSwrQkFLWDtBQUxELFdBQVksK0JBQStCO0lBQ3ZDLDJGQUFPLENBQUE7SUFDUCxxSEFBb0IsQ0FBQTtJQUNwQix5R0FBYyxDQUFBO0lBQ2QsK0dBQWlCLENBQUE7QUFDckIsQ0FBQyxFQUxXLCtCQUErQixHQUEvQix1Q0FBK0IsS0FBL0IsdUNBQStCLFFBSzFDO0FBRUQsU0FBZ0IsMkJBQTJCLENBQUMsVUFBa0IsRUFBRSxPQUFnQjtJQUM1RSxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDMUIsT0FBTywrQkFBK0IsQ0FBQyxvQkFBb0IsQ0FBQztLQUMvRDtJQUVELElBQUksT0FBTyxFQUFFO1FBQ1QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3BDLG1C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