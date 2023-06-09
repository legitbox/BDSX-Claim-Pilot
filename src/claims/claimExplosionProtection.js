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
let isExploding = false;
function onExplosion() {
    isExploding = true;
    explosion$Explode.call(this);
    isExploding = false;
}
const blockSource$setBlock = prochacker_1.procHacker.hooking('?setBlock@BlockSource@@UEAA_NAEBVBlockPos@@AEBVBlock@@HPEBUActorBlockSyncMessage@@PEAVActor@@@Z', nativetype_1.bool_t, { this: block_1.BlockSource }, blockpos_1.BlockPos, block_1.Block, nativetype_1.int32_t, core_1.VoidPointer, actor_1.Actor)(onSetBlock);
function onSetBlock(pos, block, num, blockSyncMessage, cause) {
    if (!isExploding || !configManager_1.CONFIG.claimDisableExplosions) {
        return blockSource$setBlock.call(this, pos, block, num, blockSyncMessage, cause);
    }
    const claim = (0, claim_1.getClaimAtPos)(pos, this.getDimensionId());
    if (claim === undefined) {
        return blockSource$setBlock.call(this, pos, block, num, blockSyncMessage, cause);
    }
    else {
        const currentBlock = this.getBlock(pos);
        if (currentBlock.getName() === 'minecraft:tnt' && block.getName() === 'minecraft:air') {
            return blockSource$setBlock.call(this, pos, block, num, blockSyncMessage, cause);
        }
        return false;
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1FeHBsb3Npb25Qcm90ZWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1FeHBsb3Npb25Qcm90ZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsNkJBQTZCO0FBQzdCLGdEQUEyQztBQUMzQyxnREFBbUU7QUFDbkUsMENBQXVEO0FBQ3ZELG1DQUFzQztBQUN0Qyw4Q0FBd0Q7QUFDeEQsb0NBQXNDO0FBQ3RDLDBDQUFrRDtBQUNsRCxnREFBMkM7QUFDM0Msc0NBQWtDO0FBQ2xDLHdDQUFtQztBQUNuQyxvREFBd0M7QUFFeEMsTUFBTSxlQUFlLEdBQUcsdUJBQVUsQ0FBQyxPQUFPLENBQ3RDLGlDQUFpQyxFQUNqQyxtQkFBTSxFQUNOLEVBQUMsSUFBSSxFQUFFLGFBQUssRUFBQyxFQUNiLGFBQUssQ0FDUixDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFcEIsTUFBTSxlQUFlLEdBQUcsdUJBQVUsQ0FBQyxFQUFFLENBQ2pDLGdDQUFnQyxFQUNoQyxhQUFLLEVBQ0wsRUFBQyxJQUFJLEVBQUUsYUFBSyxFQUFDLENBQ2hCLENBQUE7QUFFRCxTQUFTLGdCQUFnQixDQUFvQixNQUFhO0lBQ3RELE1BQU0sS0FBSyxHQUFVLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBSyxDQUFDLENBQUM7SUFFcEMsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ3ZDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLE9BQU87S0FDVjtJQUVELE1BQU0sS0FBSyxHQUFHLElBQUEscUJBQWEsRUFBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDekUsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO1FBQ3JCLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxD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