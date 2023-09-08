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
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou dont have permission to break blocks in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.blockPlace.on((ev) => {
    const xuid = ev.player.getXuid();
    ev.player.sendMessage("Placed!");
    const claim = (0, claim_1.getClaimAtPos)(ev.blockPos, ev.player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
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
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
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
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.actor.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return common_1.CANCEL;
    }
});
event_1.events.playerAttack.on((ev) => {
    const claim = (0, claim_1.getClaimAtPos)(ev.victim.getPosition(), ev.victim.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.player.getXuid();
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou are not allowed to harm entities in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.playerInteract.on((ev) => {
    const claim = (0, claim_1.getClaimAtPos)(ev.victim.getPosition(), ev.victim.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.player.getXuid();
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
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
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.entity.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return common_1.CANCEL;
    }
});
function handleItemUseClaimCheck(player) {
    const xuid = player.getXuid();
    const claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
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
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.culprit.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
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
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && tiller.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
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
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && actor.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
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
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
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
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
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
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && presser.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1BY3Rpb25CbG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsYWltQWN0aW9uQmxvY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQWtDO0FBQ2xDLG1DQUFzQztBQUN0Qyw4Q0FBd0Q7QUFDeEQsd0NBQW1DO0FBQ25DLDRDQUE2QztBQUM3QyxnREFBMkM7QUFDM0MsZ0RBQWlFO0FBQ2pFLDBDQUFrRDtBQUNsRCxnREFBaUQ7QUFDakQsMENBQXFDO0FBQ3JDLGtEQUE2QztBQUM3QyxrREFBdUU7QUFDdkUsb0NBQXNDO0FBSXRDLGNBQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7SUFDMUIsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQyxNQUFNLEtBQUssR0FBRyxJQUFBLHFCQUFhLEVBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFFckUsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO1FBQ3JCLE9BQU87S0FDVjtJQUVELE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUM1QyxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLHlCQUF5QixFQUFFLEtBQUssZ0NBQXNCLENBQUMsTUFBTSxFQUFFO1FBQ2pJLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJEQUEyRCxDQUFDLENBQUM7UUFDbkYsT0FBTyxlQUFNLENBQUM7S0FDakI7QUFDTCxDQUFDLENBQUMsQ0FBQTtBQUVGLGNBQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7SUFDeEIsTUFBTSxJQUFJLEdB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