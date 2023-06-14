"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const event_1 = require("bdsx/event");
const claim_1 = require("./claim");
const command_1 = require("bdsx/bds/command");
const common_1 = require("bdsx/common");
const player_1 = require("bdsx/bds/player");
const prochacker_1 = require("bdsx/prochacker");
const nativetype_1 = require("bdsx/nativetype");
const block_1 = require("bdsx/bds/block");
const blockpos_1 = require("bdsx/bds/blockpos");
const actor_1 = require("bdsx/bds/actor");
const inventory_1 = require("bdsx/bds/inventory");
const nativeclass_1 = require("bdsx/nativeclass");
const utils_1 = require("../utils");
event_1.events.blockDestroy.on((ev) => {
    const xuid = ev.player.getXuid();
    const claim = (0, claim_1.getClaimAtPos)(ev.blockPos, ev.player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou dont have permission to break blocks in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.blockPlace.on((ev) => {
    const xuid = ev.player.getXuid();
    const claim = (0, claim_1.getClaimAtPos)(ev.blockPos, ev.player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou dont have permission to place blocks in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.blockInteractedWith.on((ev) => {
    const xuid = ev.player.getXuid();
    const claim = (0, claim_1.getClaimAtPos)(ev.blockPos, ev.player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou dont have permission to use blocks in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.itemUse.on((ev) => {
    return handleItemUseClaimCheck(ev.player);
});
event_1.events.itemUseOnBlock.on((ev) => {
    if (!ev.actor.isPlayer()) {
        return;
    }
    const xuid = ev.actor.getXuid();
    const claim = (0, claim_1.getClaimAtPos)(ev, ev.actor.getDimensionId());
    if (claim === undefined) {
        return;
    }
    if (claim.owner !== xuid && ev.actor.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.actor.sendMessage('§cYou dont have permission to use items in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.playerAttack.on((ev) => {
    const claim = (0, claim_1.getClaimAtPos)(ev.victim.getPosition(), ev.victim.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.player.getXuid();
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou are not allowed to harm entities in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.blockInteractedWith.on((ev) => {
    const claim = (0, claim_1.getClaimAtPos)(ev.blockPos, ev.player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.player.getXuid();
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        console.log('In here!');
        return common_1.CANCEL;
    }
});
event_1.events.playerInteract.on((ev) => {
    const claim = (0, claim_1.getClaimAtPos)(ev.victim.getPosition(), ev.victim.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.player.getXuid();
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return common_1.CANCEL;
    }
});
event_1.events.entityStartRiding.on((ev) => {
    if (!ev.entity.isPlayer()) {
        return;
    }
    const claim = (0, claim_1.getClaimAtPos)(ev.ride.getPosition(), ev.ride.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.entity.getXuid();
    if (claim.owner !== xuid && ev.entity.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return common_1.CANCEL;
    }
});
function handleItemUseClaimCheck(player) {
    const xuid = player.getXuid();
    const claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    if (claim.owner !== xuid && player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        player.sendMessage('§cYou dont have permission to use items in this claim!');
        return common_1.CANCEL;
    }
}
event_1.events.farmlandDecay.on((ev) => {
    if (!ev.culprit.isPlayer()) {
        return;
    }
    const claim = (0, claim_1.getClaimAtPos)(ev.blockPos, ev.culprit.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.culprit.getXuid();
    if (claim.owner !== xuid && ev.culprit.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return common_1.CANCEL;
    }
    return;
});
const grassBlock$tryToTill = prochacker_1.procHacker.hooking('?tryToTill@GrassBlock@@UEBA_NAEAVBlockSource@@AEBVBlockPos@@AEAVActor@@AEAVItemStack@@@Z', nativetype_1.bool_t, { this: block_1.Block }, block_1.BlockSource, blockpos_1.BlockPos, actor_1.Actor, inventory_1.ItemStack)(onTryTill);
function onTryTill(region, pos, tiller, item) {
    if (!tiller.isPlayer()) {
        return grassBlock$tryToTill.call(this, region, pos, tiller, item);
    }
    const claim = (0, claim_1.getClaimAtPos)(pos, tiller.getDimensionId());
    if (claim === undefined) {
        return grassBlock$tryToTill.call(this, region, pos, tiller, item);
    }
    const xuid = tiller.getXuid();
    if (claim.owner !== xuid && tiller.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return false;
    }
    return grassBlock$tryToTill.call(this, region, pos, tiller, item);
}
class BucketItem extends nativeclass_1.NativeClass {
}
let InteractionResult = class InteractionResult extends nativeclass_1.NativeClass {
};
tslib_1.__decorate([
    (0, nativeclass_1.nativeField)(nativetype_1.int32_t)
], InteractionResult.prototype, "value", void 0);
InteractionResult = tslib_1.__decorate([
    (0, nativeclass_1.nativeClass)()
], InteractionResult);
let _bucketItem_useOn = prochacker_1.procHacker.hooking("?_useOn@BucketItem@@EEBA?AVInteractionResult@@AEAVItemStack@@AEAVActor@@VBlockPos@@EAEBVVec3@@@Z", InteractionResult, { this: BucketItem }, InteractionResult, inventory_1.ItemStack, actor_1.Actor, blockpos_1.BlockPos, nativetype_1.uint8_t, blockpos_1.Vec3)(onUseBucket);
function onUseBucket(res, item, actor, pos, side, uVec3) {
    if (!actor.isPlayer()) {
        return _bucketItem_useOn.call(this, res, item, actor, pos, side, uVec3);
    }
    const claim = (0, claim_1.getClaimAtPos)(pos, actor.getDimensionId());
    if (claim === undefined) {
        return _bucketItem_useOn.call(this, res, item, actor, pos, side, uVec3);
    }
    const xuid = actor.getXuid();
    if (claim.owner !== xuid && actor.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        const falseResult = InteractionResult.allocate();
        falseResult.value = 0;
        return falseResult;
    }
    return _bucketItem_useOn.call(this, res, item, actor, pos, side, uVec3);
}
const block$use = prochacker_1.procHacker.hooking('?use@Block@@QEBA_NAEAVPlayer@@AEBVBlockPos@@EV?$optional@VVec3@@@std@@@Z', nativetype_1.bool_t, { this: block_1.Block }, player_1.ServerPlayer, blockpos_1.BlockPos, nativetype_1.uint8_t)(onUseRepeater);
function onUseRepeater(player, pos, side) {
    const claim = (0, claim_1.getClaimAtPos)(pos, player.getDimensionId());
    if (claim === undefined) {
        return block$use.call(this, player, pos, side);
    }
    const xuid = player.getXuid();
    if (claim.owner !== xuid && player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        player.sendMessage('§cYou dont have permission to use blocks in this claim!');
        return false;
    }
    return block$use.call(this, player, pos, side);
}
const itemFrameBlock$attack = prochacker_1.procHacker.hooking('?attack@ItemFrameBlock@@UEBA_NPEAVPlayer@@AEBVBlockPos@@@Z', nativetype_1.bool_t, { this: block_1.Block }, player_1.ServerPlayer, blockpos_1.BlockPos)(onItemFrameAttack);
function onItemFrameAttack(player, pos) {
    const claim = (0, claim_1.getClaimAtPos)(pos, player.getDimensionId());
    if (claim === undefined) {
        return itemFrameBlock$attack.call(this, player, pos);
    }
    const xuid = player.getXuid();
    if (claim.owner !== xuid && player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return false;
    }
    return itemFrameBlock$attack.call(this, player, pos);
}
const basePressurePlate$checkPressed = prochacker_1.procHacker.hooking('?checkPressed@BasePressurePlateBlock@@IEBAXAEAVBlockSource@@AEBVBlockPos@@PEAVActor@@HH@Z', nativetype_1.void_t, { this: block_1.Block }, block_1.BlockSource, blockpos_1.BlockPos, actor_1.Actor, nativetype_1.int32_t, nativetype_1.int32_t)(onCheckPressed);
function onCheckPressed(region, pos, presser, uNum1, uNum2) {
    if (presser === null || !presser.isPlayer()) {
        return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
    }
    const claim = (0, claim_1.getClaimAtPos)(pos, region.getDimensionId());
    if (claim === undefined) {
        return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
    }
    const xuid = presser.getXuid();
    if (claim.owner !== xuid && presser.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return;
    }
    return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
}
const liquidBlockDynamic$canSpreadTo = prochacker_1.procHacker.hooking('?_canSpreadTo@LiquidBlockDynamic@@AEBA_NAEAVBlockSource@@AEBVBlockPos@@1E@Z', nativetype_1.bool_t, { this: block_1.Block }, block_1.BlockSource, blockpos_1.BlockPos, blockpos_1.BlockPos, nativetype_1.uint8_t)(onRequestCanFlow);
function onRequestCanFlow(region, target, source, side) {
    const claim = (0, claim_1.getClaimAtPos)(target, region.getDimensionId());
    if (claim === undefined) {
        return liquidBlockDynamic$canSpreadTo.call(this, region, target, source, side);
    }
    if ((0, utils_1.isPointInBox)(source, claim.cornerOne, claim.cornerEight)) {
        return liquidBlockDynamic$canSpreadTo.call(this, region, target, source, side);
    }
    else {
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1BY3Rpb25CbG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsYWltQWN0aW9uQmxvY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQWtDO0FBQ2xDLG1DQUFzQztBQUN0Qyw4Q0FBd0Q7QUFDeEQsd0NBQW1DO0FBQ25DLDRDQUE2QztBQUM3QyxnREFBMkM7QUFDM0MsZ0RBQWlFO0FBQ2pFLDBDQUFrRDtBQUNsRCxnREFBaUQ7QUFDakQsMENBQXFDO0FBQ3JDLGtEQUE2QztBQUM3QyxrREFBdUU7QUFDdkUsb0NBQXNDO0FBRXRDLGNBQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7SUFDMUIsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQyxNQUFNLEtBQUssR0FBRyxJQUFBLHFCQUFhLEVBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFFckUsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO1FBQ3JCLE9BQU87S0FDVjtJQUVELElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLGdDQUFzQixDQUFDLE1BQU0sRUFBRTtRQUNqRyxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQywyREFBMkQsQ0FBQyxDQUFDO1FBQ25GLE9BQU8sZUFBTSxDQUFDO0tBQ2pCO0FBQ0wsQ0FBQyxDQUFDLENBQUE7QUFFRixjQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO0lBQ3hCLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakMsTUFBTSxLQUFLLEdBQUcsSUFBQSxxQkFBYSxFQUFDLEVBQUUsQ0FBQyxR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