"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopBuilder = exports.getClaimBuilder = exports.triggerWandUse = exports.ClaimBuilder = exports.ClaimBuildFailReason = void 0;
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
    ClaimBuildFailReason[ClaimBuildFailReason["PlayerGone"] = 2] = "PlayerGone";
    ClaimBuildFailReason[ClaimBuildFailReason["OverlappingClaim"] = 3] = "OverlappingClaim";
    ClaimBuildFailReason[ClaimBuildFailReason["InsufficientBlocks"] = 4] = "InsufficientBlocks";
    ClaimBuildFailReason[ClaimBuildFailReason["TooSmall"] = 5] = "TooSmall";
})(ClaimBuildFailReason = exports.ClaimBuildFailReason || (exports.ClaimBuildFailReason = {}));
const builders = new Map();
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
    build() {
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
        if (!res) {
            return ClaimBuildFailReason.InsufficientBlocks;
        }
        if (configManager_1.CONFIG.claimMinimumWidth !== -1) {
            const width = Math.round(cornerTwo.x - cornerOne.x);
            if (width < configManager_1.CONFIG.claimMinimumWidth) {
                return ClaimBuildFailReason.TooSmall;
            }
        }
        if (configManager_1.CONFIG.claimMinimumLength !== -1) {
            const length = Math.round(cornerTwo.z - cornerOne.z);
            if (length < configManager_1.CONFIG.claimMinimumLength) {
                return ClaimBuildFailReason.TooSmall;
            }
        }
        if (configManager_1.CONFIG.claimMinimumHeight !== -1) {
            const height = Math.round(cornerTwo.y - cornerOne.y);
            if (height < configManager_1.CONFIG.claimMinimumHeight) {
                return ClaimBuildFailReason.TooSmall;
            }
        }
        if (configManager_1.CONFIG.claimMinimumBlocks !== -1) {
            if (blockCost < configManager_1.CONFIG.claimMinimumBlocks) {
                return ClaimBuildFailReason.TooSmall;
            }
        }
        return (0, claim_1.registerNewClaim)(this.ownerXuid, this.name, this.pos1, this.pos2, this.dimensionId);
    }
}
exports.ClaimBuilder = ClaimBuilder;
function triggerWandUse(pos, player) {
    const dimensionId = player.getDimensionId();
    const overlappedClaim = (0, claim_1.getClaimAtPos)(pos, dimensionId);
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
    if (!canPlaceInDimension) {
        player.sendMessage('§cClaims are not allowed in this dimension!');
        return;
    }
    if (overlappedClaim !== undefined) {
        // Already a claim at that spot!
        player.sendMessage('§cThat block overlaps an already existing claim!');
        return;
    }
    const xuid = player.getXuid();
    const availableBlocks = (0, claimBlocksManager_1.getPlayerFreeBlocks)(xuid);
    if (availableBlocks <= 0) {
        player.sendMessage('§cYou dont have any free blocks!');
        return;
    }
    let builder = builders.get(xuid);
    if (builder === undefined) {
        builder = new ClaimBuilder(xuid, pos, dimensionId);
        builder.setName(`${player.getName()}'s claim`);
        player.sendMessage(`§aFirst pos selected! (${pos.x}, ${pos.y}, ${pos.z})`);
        builders.set(xuid, builder);
        return;
    }
    else {
        builder.setPos2(pos);
        const claim = builder.build();
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
            builders.delete(xuid);
            return;
        }
        const { cornerOne, cornerTwo } = (0, utils_1.organizeCorners)(builder.pos1, builder.pos2);
        const blockCost = (0, utils_1.getNumOfBlocksInBox)(cornerOne, cornerTwo);
        player.sendMessage(`§aClaim created! You used §e${blockCost}§a blocks, you have §e${(0, claimBlocksManager_1.getPlayerFreeBlocks)(xuid)}§a blocks remaining!`);
        builders.delete(xuid);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1CdWlsZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1CdWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRFQUF1RTtBQUN2RSxtQ0FBZ0Y7QUFDaEYsMENBQTJDO0FBSTNDLG9DQUEwRTtBQUMxRSw2REFBZ0Y7QUFDaEYsb0RBQXdDO0FBRXhDLElBQVksb0JBT1g7QUFQRCxXQUFZLG9CQUFvQjtJQUM1QixtRUFBTSxDQUFBO0lBQ04sbUVBQU0sQ0FBQTtJQUNOLDJFQUFVLENBQUE7SUFDVix1RkFBZ0IsQ0FBQTtJQUNoQiwyRkFBa0IsQ0FBQTtJQUNsQix1RUFBUSxDQUFBO0FBQ1osQ0FBQyxFQVBXLG9CQUFvQixHQUFwQiw0QkFBb0IsS0FBcEIsNEJBQW9CLFFBTy9CO0FBRUQsTUFBTSxRQUFRLEdBQThCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFdEQsTUFBYSxZQUFZO0lBT3JCLFlBQVksU0FBaUIsRUFBRSxHQUFjLEVBQUUsV0FBd0I7UUFDbkUsSUFBSSxJQUFzQixDQUFDO1FBQzNCLElBQUksR0FBRyxZQUFZLG1DQUFnQixFQUFFO1lBQ2pDLElBQUksR0FBRyxHQUFHLENBQUM7U0FDZDthQUFNO1lBQ0gsSUFBSSxHQUFHLElBQUksbUNBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDcEM7UUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztJQUNuQyxDQUFDO0lBRUQsT0FBTyxDQUFDLElBQVk7UUFDaEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFjO1FBQ2xCLElBQUksSUFBc0IsQ0FBQztRQUMzQixJQUFJLEdBQUcsWUFBWSxtQ0FBZ0IsRUFBRTtZQUNq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