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
    if (!checkCanInteractWithBlock(ev.player, ev.blockPos)) {
        return common_1.CANCEL;
    }
});
event_1.events.blockPlace.on((ev) => {
    if (!checkCanInteractWithBlock(ev.player, ev.blockPos)) {
        return common_1.CANCEL;
    }
});
event_1.events.blockInteractedWith.on((ev) => {
    if (!checkCanInteractWithBlock(ev.player, ev.blockPos)) {
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
    if (!checkCanInteractWithBlock(ev.actor, ev)) {
        return common_1.CANCEL;
    }
});
event_1.events.playerAttack.on((ev) => {
    if (!checkCanInteractWithTarget(ev.player, ev.victim)) {
        return common_1.CANCEL;
    }
});
event_1.events.playerInteract.on((ev) => {
    if (!checkCanInteractWithTarget(ev.player, ev.victim)) {
        return common_1.CANCEL;
    }
});
event_1.events.entityStartRiding.on((ev) => {
    if (!ev.entity.isPlayer()) {
        return;
    }
    if (!checkCanInteractWithTarget(ev.entity, ev.ride)) {
        return common_1.CANCEL;
    }
});
function handleItemUseClaimCheck(player) {
    if (!checkCanInteractWithBlock(player, player.getPosition())) {
        return common_1.CANCEL;
    }
}
event_1.events.farmlandDecay.on((ev) => {
    if (!ev.culprit.isPlayer()) {
        return;
    }
    if (!checkCanInteractWithBlock(ev.culprit, ev.blockPos)) {
        return common_1.CANCEL;
    }
});
const grassBlock$tryToTill = prochacker_1.procHacker.hooking('?tryToTill@GrassBlock@@UEBA_NAEAVBlockSource@@AEBVBlockPos@@AEAVActor@@AEAVItemStack@@@Z', nativetype_1.bool_t, { this: block_1.Block }, block_1.BlockSource, blockpos_1.BlockPos, actor_1.Actor, inventory_1.ItemStack)(onTryTill);
function onTryTill(region, pos, tiller, item) {
    if (!tiller.isPlayer()) {
        return grassBlock$tryToTill.call(this, region, pos, tiller, item);
    }
    if (checkCanInteractWithBlock(tiller, pos)) {
        return grassBlock$tryToTill.call(this, region, pos, tiller, item);
    }
    else {
        return false;
    }
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
    if (checkCanInteractWithBlock(actor, pos)) {
        return _bucketItem_useOn.call(this, res, item, actor, pos, side, uVec3);
    }
    else {
        const falseResult = InteractionResult.allocate();
        falseResult.value = 0;
        return falseResult;
    }
}
const block$use = prochacker_1.procHacker.hooking('?use@Block@@QEBA_NAEAVPlayer@@AEBVBlockPos@@EV?$optional@VVec3@@@std@@@Z', nativetype_1.bool_t, { this: block_1.Block }, player_1.ServerPlayer, blockpos_1.BlockPos, nativetype_1.uint8_t)(onUseRepeater);
function onUseRepeater(player, pos, side) {
    if (checkCanInteractWithBlock(player, pos)) {
        return block$use.call(this, player, pos, side);
    }
    else {
        return false;
    }
}
const itemFrameBlock$attack = prochacker_1.procHacker.hooking('?attack@ItemFrameBlock@@UEBA_NPEAVPlayer@@AEBVBlockPos@@@Z', nativetype_1.bool_t, { this: block_1.Block }, player_1.ServerPlayer, blockpos_1.BlockPos)(onItemFrameAttack);
function onItemFrameAttack(player, pos) {
    if (checkCanInteractWithBlock(player, pos)) {
        return itemFrameBlock$attack.call(this, player, pos);
    }
    else {
        return false;
    }
}
const basePressurePlate$checkPressed = prochacker_1.procHacker.hooking('?checkPressed@BasePressurePlateBlock@@IEBAXAEAVBlockSource@@AEBVBlockPos@@PEAVActor@@HH@Z', nativetype_1.void_t, { this: block_1.Block }, block_1.BlockSource, blockpos_1.BlockPos, actor_1.Actor, nativetype_1.int32_t, nativetype_1.int32_t)(onCheckPressed);
function onCheckPressed(region, pos, presser, uNum1, uNum2) {
    if (presser === null || !presser.isPlayer()) {
        return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
    }
    if (checkCanInteractWithBlock(presser, pos)) {
        return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
    }
    else {
        return;
    }
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
function checkCanInteractWithBlock(player, pos, _checkedPermission) {
    const claim = (0, claim_1.getClaimAtPos)(pos, player.getDimensionId());
    if (claim === undefined) {
        return true;
    }
    const xuid = player.getXuid();
    const claimMembers = claim.getMemberXuids();
    return !(claim.owner !== xuid && !claimMembers.includes(xuid) && player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal);
}
function checkCanInteractWithTarget(player, target, _checkedPermission) {
    const claim = (0, claim_1.getClaimAtPos)(target.getPosition(), target.getDimensionId());
    if (claim === undefined) {
        return true;
    }
    const xuid = player.getXuid();
    const claimMembers = claim.getMemberXuids();
    return !(claim.owner !== xuid && !claimMembers.includes(xuid) && player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1BY3Rpb25CbG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsYWltQWN0aW9uQmxvY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQWtDO0FBQ2xDLG1DQUFzQztBQUN0Qyw4Q0FBd0Q7QUFDeEQsd0NBQThDO0FBQzlDLDRDQUE2QztBQUM3QyxnREFBMkM7QUFDM0MsZ0RBQWlFO0FBQ2pFLDBDQUFrRDtBQUNsRCxnREFBaUQ7QUFDakQsMENBQXFDO0FBQ3JDLGtEQUE2QztBQUM3QyxrREFBdUU7QUFDdkUsb0NBQXNDO0FBRXRDLGNBQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7SUFDMUIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ3BELE9BQU8sZUFBTSxDQUFDO0tBQ2pCO0FBQ0wsQ0FBQyxDQUFDLENBQUE7QUFFRixjQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO0lBQ3hCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUNwRCxPQUFPLGVBQU0sQ0FBQztLQUNqQjtBQUNMLENBQUMsQ0FBQyxDQUFBO0FBRUYsY0FBTSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO0lBQ2pDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUNwRCxPQUFPLGVBQU0sQ0FBQztLQUNqQjtBQUNMLENBQUMsQ0FBQyxDQUFBO0FBRUYsY0FBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtJQUNyQixPQUFPLHVCQUF1QixDQUFDLEVBQUUsQ0FB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