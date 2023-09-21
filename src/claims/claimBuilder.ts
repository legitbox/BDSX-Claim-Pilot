import {SerializableVec3} from "../SerializableTypes/SerializableVec3";
import {Claim, getClaimAtPos, isAnyClaimInBox, registerNewClaim, registerNewServerClaim} from "./claim";
import {DimensionId} from "bdsx/bds/actor";
import {BlockPos} from "bdsx/bds/blockpos";
import {ServerPlayer} from "bdsx/bds/player";
import {VectorXYZ} from "bdsx/common";
import {BoxCorners, getNumOfBlocksInBox, organizeCorners} from "../utils";
import {addUsedBlocksToPlayer, getPlayerFreeBlocks} from "./claimBlocksManager";
import {CONFIG} from "../configManager";
import {getExtraData} from "../events/claimCreatedEvent";

export enum ClaimBuildFailReason {
    NoPos2,
    NoName,
    OverlappingClaim,
    InsufficientBlocks,
    TooSmall,
}

const builders: Map<string, ClaimBuilder> = new Map();
let serverClaimBuilders: string[] = [];

export function isPlayerServerBuilder(playerXuid: string) {
    return serverClaimBuilders.includes(playerXuid);
}

export enum PlayerServerBuilderToggleResult {
    Success,
    AlreadyBuildingClaim,
    AlreadyBuilder,
    AlreadyNotBuilder,
}

export function setPlayerServerBuilderState(playerXuid: string, enabled: boolean) {
    if (builders.has(playerXuid)) {
        return PlayerServerBuilderToggleResult.AlreadyBuildingClaim;
    }

    if (enabled) {
        if (!isPlayerServerBuilder(playerXuid)) {
            serverClaimBuilders.push(playerXuid);
            return PlayerServerBuilderToggleResult.Success;
        } else {
            return PlayerServerBuilderToggleResult.AlreadyBuilder;
        }
    } else {
        let didRemove = false;
        serverClaimBuilders = serverClaimBuilders.filter((value) => {
            let isRemoving = value === playerXuid;
            if (isRemoving) {
                didRemove = true;
            }

            return !isRemoving;
        })

        if (didRemove) {
            return PlayerServerBuilderToggleResult.Success
        } else {
            return PlayerServerBuilderToggleResult.AlreadyNotBuilder;
        }
    }
}

export class ClaimBuilder {
    ownerXuid: string;
    name: string | undefined;
    pos1: SerializableVec3;
    pos2: SerializableVec3 | undefined;
    dimensionId: DimensionId;

    constructor(ownerXuid: string, pos: VectorXYZ, dimensionId: DimensionId) {
        let pos1: SerializableVec3;
        if (pos instanceof SerializableVec3) {
            pos1 = pos;
        } else {
            pos1 = new SerializableVec3(pos);
        }

        this.ownerXuid = ownerXuid;
        this.pos1 = pos1;
        this.dimensionId = dimensionId;
    }

    setName(name: string) {
        this.name = name;
        return this;
    }

    setPos2(pos: VectorXYZ) {
        let pos2: SerializableVec3;
        if (pos instanceof SerializableVec3) {
            pos2 = pos;
        } else {
            pos2 = new SerializableVec3(pos);
        }

        this.pos2 = pos2;
        return this;
    }

    async build(creatorXuid: string, isServer: boolean = false) {
        if (this.pos2 === undefined) {
            return ClaimBuildFailReason.NoPos2
        } else if (this.name === undefined) {
            return ClaimBuildFailReason.NoName;
        }

        const {cornerOne, cornerTwo} = organizeCorners(this.pos1, this.pos2);

        const box = new BoxCorners(cornerOne, cornerTwo);
        if (isAnyClaimInBox(box, this.dimensionId)) {
            return ClaimBuildFailReason.OverlappingClaim;
        }

        const blockCost = getNumOfBlocksInBox(cornerOne, cornerTwo);

        const res = addUsedBlocksToPlayer(this.ownerXuid, blockCost);

        if (!res && !isServer) {
            return ClaimBuildFailReason.InsufficientBlocks;
        }

        if (CONFIG.claimMinimumWidth !== -1 && !isServer) {
            const width = Math.round(cornerTwo.x - cornerOne.x);
            if (width < CONFIG.claimMinimumWidth) {
                return ClaimBuildFailReason.TooSmall;
            }
        }

        if (CONFIG.claimMinimumLength !== -1 && !isServer) {
            const length = Math.round(cornerTwo.z - cornerOne.z);
            if (length < CONFIG.claimMinimumLength) {
                return ClaimBuildFailReason.TooSmall;
            }
        }

        if (CONFIG.claimMinimumHeight !== -1 && !isServer) {
            const height = Math.round(cornerTwo.y - cornerOne.y);
            if (height < CONFIG.claimMinimumHeight) {
                return ClaimBuildFailReason.TooSmall;
            }
        }

        if (CONFIG.claimMinimumBlocks !== -1 && !isServer) {
            if (blockCost < CONFIG.claimMinimumBlocks) {
                return ClaimBuildFailReason.TooSmall;
            }
        }

        if (isServer) {
            return await registerNewServerClaim(this.name, this.pos1, this.pos2, this.dimensionId, creatorXuid);
        } else {
            return await registerNewClaim(this.ownerXuid, this.name, this.pos1, this.pos2, this.dimensionId);
        }
    }
}

export async function triggerWandUse(pos: BlockPos, player: ServerPlayer) {
    const playerXuid = player.getXuid();

    const dimensionId = player.getDimensionId();
    const overlappedClaim = getClaimAtPos(pos, dimensionId);

    const isServerClaim = isPlayerServerBuilder(playerXuid);

    let canPlaceInDimension;
    switch (dimensionId) {
        case DimensionId.Overworld:
            canPlaceInDimension = CONFIG.allowedClaimDimension.Overworld;
            break;
        case DimensionId.Nether:
            canPlaceInDimension = CONFIG.allowedClaimDimension.Nether;
            break;
        case DimensionId.TheEnd:
            canPlaceInDimension = CONFIG.allowedClaimDimension.End;
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
        availableBlocks = getPlayerFreeBlocks(claimXuid);
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
        } else {
            builder.setName(`${player.getName()}'s claim`);
        }

        player.sendMessage(`§aFirst pos selected! (${pos.x}, ${pos.y}, ${pos.z})`);

        builders.set(playerXuid, builder);

        return;
    } else {
        const playerDimension = player.getDimensionId();
        if (playerDimension !== builder.dimensionId) {
            player.sendMessage(`§cYou cant make a claim across dimensions!`);

            return;
        }

        builder.setPos2(pos);
        const claim = await builder.build(playerXuid, isServerClaim);

        if (!(claim instanceof Claim)) {
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
                    const {cornerOne, cornerTwo} = organizeCorners(builder.pos1, builder.pos2!);
                    const blockCost = getNumOfBlocksInBox(cornerOne, cornerTwo);

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
        } else {
            const {cornerOne, cornerTwo} = organizeCorners(builder.pos1, builder.pos2!);
            const blockCost = getNumOfBlocksInBox(cornerOne, cornerTwo);

            const extraData = getExtraData(claim.id);

            if (extraData.shouldSendDefaultMessage) {
                player.sendMessage(`§aClaim created! You used §e${blockCost}§a blocks, you have §e${getPlayerFreeBlocks(playerXuid)}§a blocks remaining!`);
            }

            builders.delete(playerXuid);
        }
    }
}

export function getClaimBuilder(xuid: string) {
    return builders.get(xuid);
}

export function stopBuilder(xuid: string) {
    builders.delete(xuid);
}

export enum CancelClaimResult {
    Success,
    NotABuilder,
}

export function cancelClaim(xuid: string) {
    const builder = getClaimBuilder(xuid);

    if (builder === undefined) {
        return CancelClaimResult.NotABuilder;
    }

    stopBuilder(xuid);

    return CancelClaimResult.Success;
}
