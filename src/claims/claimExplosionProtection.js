"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Blocking creeper explosion
const prochacker_1 = require("bdsx/prochacker");
const nativetype_1 = require("bdsx/nativetype");
const actor_1 = require("bdsx/bds/actor");
const claim_1 = require("./claim");
const command_1 = require("bdsx/bds/command");
const core_1 = require("bdsx/core");
const block_1 = require("bdsx/bds/block");
const blockpos_1 = require("bdsx/bds/blockpos");
const event_1 = require("bdsx/event");
const common_1 = require("bdsx/common");
const configManager_1 = require("../configManager");
const dllManager_1 = require("../Native/dllManager");
const actor$setTarget = prochacker_1.procHacker.hooking('?setTarget@Actor@@UEAAXPEAV1@@Z', nativetype_1.void_t, { this: actor_1.Actor }, actor_1.Actor)(onActorSetTarget);
const actor$getTarget = prochacker_1.procHacker.js('?getTarget@Actor@@QEBAPEAV1@XZ', actor_1.Actor, { this: actor_1.Actor });
function onActorSetTarget(target) {
    const actor = this.as(actor_1.Actor);
    if (target === null || !target.isPlayer()) {
        actor$setTarget.call(this, target);
        return;
    }
    const claim = (0, claim_1.getClaimAtPos)(actor.getPosition(), actor.getDimensionId());
    if (claim === undefined) {
        actor$setTarget.call(actor, target);
        return;
    }
    const xuid = target.getXuid();
    if (claim.owner !== xuid && target.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return;
    }
    actor$setTarget.call(actor, target);
}
const creeper$getSwellDir = prochacker_1.procHacker.hooking('?_setSwellDir@Creeper@@AEAAXH@Z', nativetype_1.void_t, { this: actor_1.Actor }, nativetype_1.int32_t)(onCreeperGetSwell);
function onCreeperGetSwell(num) {
    const target = actor$getTarget.call(this);
    if (target === null || !target.isPlayer()) {
        return creeper$getSwellDir.call(this, num);
    }
    const claim = (0, claim_1.getClaimAtPos)(target.getPosition(), target.getDimensionId());
    if (claim === undefined) {
        return creeper$getSwellDir.call(this, num);
    }
    const xuid = target.getXuid();
    if (claim.owner !== xuid && target.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        actor$setTarget.call(this, null);
    }
    return creeper$getSwellDir.call(this, num);
}
const explosion$Explode = prochacker_1.procHacker.hooking('?explode@Explosion@@QEAAXXZ', nativetype_1.void_t, { this: core_1.VoidPointer })(onExplosion);
function onExplosion() {
    (0, dllManager_1.setSetBlockHookEnabled)(true);
    explosion$Explode.call(this);
    (0, dllManager_1.setSetBlockHookEnabled)(false);
}
const block$trySpawnResourcesOnExplosion = prochacker_1.procHacker.hooking('?trySpawnResourcesOnExplosion@Block@@QEBAXAEAVBlockSource@@AEBVBlockPos@@AEBV1@M@Z', nativetype_1.void_t, { this: block_1.Block }, block_1.BlockSource, blockpos_1.BlockPos, block_1.Block, nativetype_1.float32_t)(onSpawnExplosionResource);
function onSpawnExplosionResource(region, pos, block, uFloat) {
    if (!configManager_1.CONFIG.claimDisableExplosions) {
        return block$trySpawnResourcesOnExplosion.call(this, region, pos, block, uFloat);
    }
    const claim = (0, claim_1.getClaimAtPos)(pos, region.getDimensionId());
    if (claim === undefined) {
        return block$trySpawnResourcesOnExplosion.call(this, region, pos, block, uFloat);
    }
    return;
}
event_1.events.entityHurt.on((ev) => {
    if (!configManager_1.CONFIG.claimDisableExplosions) {
        return;
    }
    const claim = (0, claim_1.getClaimAtPos)(ev.entity.getPosition(), ev.entity.getDimensionId());
    if (claim === undefined) {
        return;
    }
    if (ev.damageSource.cause === actor_1.ActorDamageCause.BlockExplosion || ev.damageSource.cause === actor_1.ActorDamageCause.EntityExplosion) {
        return common_1.CANCEL;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1FeHBsb3Npb25Qcm90ZWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1FeHBsb3Npb25Qcm90ZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsNkJBQTZCO0FBQzdCLGdEQUEyQztBQUMzQyxnREFBMkQ7QUFDM0QsMENBQXVEO0FBQ3ZELG1DQUFzQztBQUN0Qyw4Q0FBd0Q7QUFDeEQsb0NBQXNDO0FBQ3RDLDBDQUFrRDtBQUNsRCxnREFBMkM7QUFDM0Msc0NBQWtDO0FBQ2xDLHdDQUFtQztBQUNuQyxvREFBd0M7QUFDeEMscURBQTREO0FBRTVELE1BQU0sZUFBZSxHQUFHLHVCQUFVLENBQUMsT0FBTyxDQUN0QyxpQ0FBaUMsRUFDakMsbUJBQU0sRUFDTixFQUFDLElBQUksRUFBRSxhQUFLLEVBQUMsRUFDYixhQUFLLENBQ1IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRXBCLE1BQU0sZUFBZSxHQUFHLHVCQUFVLENBQUMsRUFBRSxDQUNqQyxnQ0FBZ0MsRUFDaEMsYUFBSyxFQUNMLEVBQUMsSUFBSSxFQUFFLGFBQUssRUFBQyxDQUNoQixDQUFBO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBb0IsTUFBYTtJQUN0RCxNQUFNLEtBQUssR0FBVSxJQUFJLENBQUMsRUFBRSxDQUFDLGFBQUssQ0FBQyxDQUFDO0lBRXBDLElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUN2QyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNuQyxPQUFPO0tBQ1Y7SUFFRCxNQUFNLEtBQUssR0FBRyxJQUFBLHFCQUFhLEVBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQ3pFLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtRQUNyQixlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssRUFB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