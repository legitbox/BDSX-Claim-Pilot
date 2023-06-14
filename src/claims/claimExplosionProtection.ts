// Blocking creeper explosion
import {procHacker} from "bdsx/prochacker";
import {float32_t, int32_t, void_t} from "bdsx/nativetype";
import {Actor, ActorDamageCause} from "bdsx/bds/actor";
import {getClaimAtPos} from "./claim";
import {CommandPermissionLevel} from "bdsx/bds/command";
import {VoidPointer} from "bdsx/core";
import {Block, BlockSource} from "bdsx/bds/block";
import {BlockPos} from "bdsx/bds/blockpos";
import {events} from "bdsx/event";
import {CANCEL} from "bdsx/common";
import {CONFIG} from "../configManager";
import {setSetBlockHookEnabled} from "../Native/dllManager";

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
    setSetBlockHookEnabled(true);
    explosion$Explode.call(this);
    isExploding = false;
    setSetBlockHookEnabled(false);
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
