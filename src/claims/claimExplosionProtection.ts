// Blocking creeper explosion
import {procHacker} from "bdsx/prochacker";
import {bool_t, float32_t, int32_t, void_t} from "bdsx/nativetype";
import {Actor, ActorDamageCause} from "bdsx/bds/actor";
import {getClaimAtPos} from "./claim";
import {CommandPermissionLevel} from "bdsx/bds/command";
import {VoidPointer} from "bdsx/core";
import {Block, BlockSource} from "bdsx/bds/block";
import {BlockPos} from "bdsx/bds/blockpos";
import {events} from "bdsx/event";
import {CANCEL} from "bdsx/common";
import {CONFIG} from "../configManager";

const actor$setTarget = procHacker.hooking(
    '?setTarget@Actor@@UEAAXPEAV1@@Z',
    void_t,
    {this: Actor},
    Actor,
)(onActorSetTarget);

const actor$getTarget = procHacker.js(
    '?getTarget@Actor@@QEBAPEAV1@XZ',
    Actor,
    {this: Actor},
)

function onActorSetTarget(this: VoidPointer, target: Actor) {
    const actor: Actor = this.as(Actor);

    if (target === null || !target.isPlayer()) {
        actor$setTarget.call(this, target);
        return;
    }

    const claim = getClaimAtPos(actor.getPosition(), actor.getDimensionId());
    if (claim === undefined) {
        actor$setTarget.call(actor, target);
        return;
    }

    const xuid = target.getXuid();
    if (claim.owner !== xuid && target.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        return;
    }

    actor$setTarget.call(actor, target);
}

const creeper$getSwellDir = procHacker.hooking(
    '?_setSwellDir@Creeper@@AEAAXH@Z',
    void_t,
    {this: Actor},
    int32_t,
)(onCreeperGetSwell);

function onCreeperGetSwell(this: Actor, num: int32_t) {
    const target: Actor = actor$getTarget.call(this);
    if (target === null || !target.isPlayer()) {
        return creeper$getSwellDir.call(this, num);
    }

    const claim = getClaimAtPos(target.getPosition(), target.getDimensionId());
    if (claim === undefined) {
        return creeper$getSwellDir.call(this, num);
    }

    const xuid = target.getXuid();
    if (claim.owner !== xuid && target.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        actor$setTarget.call(this, null);
    }

    return creeper$getSwellDir.call(this, num);
}

const explosion$Explode = procHacker.hooking(
    '?explode@Explosion@@QEAAXXZ',
    void_t,
    {this: VoidPointer},
)(onExplosion);

let isExploding = false;

function onExplosion(this: VoidPointer) {
    isExploding = true;
    explosion$Explode.call(this);
    isExploding = false;
}

const blockSource$setBlock = procHacker.hooking(
    '?setBlock@BlockSource@@UEAA_NAEBVBlockPos@@AEBVBlock@@HPEBUActorBlockSyncMessage@@PEAVActor@@@Z',
    bool_t,
    {this: BlockSource},
    BlockPos,
    Block,
    int32_t,
    VoidPointer,
    Actor,
)(onSetBlock);

function onSetBlock(this: BlockSource, pos: BlockPos, block: Block, num: int32_t, blockSyncMessage: VoidPointer, cause: Actor) {
    if (!isExploding || !CONFIG.claimDisableExplosions) {
        return blockSource$setBlock.call(this, pos, block, num, blockSyncMessage, cause);
    }

    const claim = getClaimAtPos(pos, this.getDimensionId());
    if (claim === undefined) {
        return blockSource$setBlock.call(this, pos, block, num, blockSyncMessage, cause);
    } else {
        const currentBlock = this.getBlock(pos);
        if (currentBlock.getName() === 'minecraft:tnt' && block.getName() === 'minecraft:air') {
            return blockSource$setBlock.call(this, pos, block, num, blockSyncMessage, cause);
        }

        return false;
    }
}

const block$trySpawnResourcesOnExplosion = procHacker.hooking(
    '?trySpawnResourcesOnExplosion@Block@@QEBAXAEAVBlockSource@@AEBVBlockPos@@AEBV1@M@Z',
    void_t,
    {this: Block},
    BlockSource,
    BlockPos,
    Block,
    float32_t,
)(onSpawnExplosionResource);

function onSpawnExplosionResource(this: Block, region: BlockSource, pos: BlockPos, block: Block, uFloat: number) {
    if (!CONFIG.claimDisableExplosions) {
        return block$trySpawnResourcesOnExplosion.call(this, region, pos, block, uFloat);
    }

    const claim = getClaimAtPos(pos, region.getDimensionId());
    if (claim === undefined) {
        return block$trySpawnResourcesOnExplosion.call(this, region, pos, block, uFloat);
    }

    return;
}

events.entityHurt.on((ev) => {
    if (!CONFIG.claimDisableExplosions) {
        return;
    }

    const claim = getClaimAtPos(ev.entity.getPosition(), ev.entity.getDimensionId());
    if (claim === undefined) {
        return;
    }

    if (ev.damageSource.cause === ActorDamageCause.BlockExplosion || ev.damageSource.cause === ActorDamageCause.EntityExplosion) {
        return CANCEL;
    }
})
