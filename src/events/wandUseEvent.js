"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WandUseEvent = void 0;
const blockpos_1 = require("bdsx/bds/blockpos");
const eventStorage_1 = require("./eventStorage");
const common_1 = require("bdsx/common");
const event_1 = require("bdsx/event");
const configManager_1 = require("../configManager");
const utils_1 = require("../utils");
const claimBuilder_1 = require("../claims/claimBuilder");
var WandUseEvent;
(function (WandUseEvent) {
    WandUseEvent.ID = 'WandUseEvent';
    WandUseEvent.CANCELABLE = true;
    WandUseEvent.ASYNC_ALLOWED = false;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(WandUseEvent.ID, callback);
    }
    WandUseEvent.register = register;
    function handleFireCallbacks(callbacks, data) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const res = callback(data.pos, data.player, data.item);
            if (res !== undefined && !res) {
                shouldExecute = false;
            }
        }
        return shouldExecute;
    }
    WandUseEvent.handleFireCallbacks = handleFireCallbacks;
})(WandUseEvent = exports.WandUseEvent || (exports.WandUseEvent = {}));
(0, eventStorage_1.registerEventType)(WandUseEvent);
const wandUseMap = new Map();
event_1.events.itemUseOnBlock.on((ev) => {
    // Checking if a wand was used
    if (!(0, utils_1.isWand)(ev.itemStack)) {
        return;
    }
    // Checking a player is what used the item
    const player = ev.actor;
    if (!player.isPlayer()) {
        return;
    }
    const xuid = player.getXuid();
    const lastUse = wandUseMap.get(xuid);
    const now = Date.now();
    if (lastUse !== undefined && (now - lastUse) <= configManager_1.CONFIG.wandFireRate) {
        // Player is still in the cool down for the item
        return common_1.CANCEL;
    }
    wandUseMap.set(xuid, now);
    const bPos = blockpos_1.BlockPos.create(ev);
    const res = (0, eventStorage_1.fireEvent)(WandUseEvent.ID, {
        pos: bPos,
        player: player,
        item: ev.itemStack,
    });
    if (res) {
        (0, claimBuilder_1.triggerWandUse)(bPos, player).then();
    }
    return common_1.CANCEL;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2FuZFVzZUV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2FuZFVzZUV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGdEQUEyQztBQUMzQyxpREFBMkU7QUFDM0Usd0NBQW1DO0FBQ25DLHNDQUFrQztBQUNsQyxvREFBd0M7QUFHeEMsb0NBQWdDO0FBQ2hDLHlEQUFzRDtBQUV0RCxJQUFpQixZQUFZLENBc0I1QjtBQXRCRCxXQUFpQixZQUFZO0lBQ1osZUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQix1QkFBVSxHQUFHLElBQUksQ0FBQztJQUNsQiwwQkFBYSxHQUFHLEtBQUssQ0FBQztJQUduQyxTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDdkMsSUFBQSw0QkFBYSxFQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUZlLHFCQUFRLFdBRXZCLENBQUE7SUFFRCxTQUFnQixtQkFBbUIsQ0FBQyxTQUFxQixFQUFFLElBQVM7UUFDaEUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQzlCLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXZELElBQUksR0FBRyxLQUFLLFNBQVMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDM0IsYUFBYSxHQUFHLEtBQUssQ0FBQzthQUN6QjtTQUNKO1FBRUQsT0FBTyxhQUFhLENBQUM7SUFDekIsQ0FBQztJQVhlLGdDQUFtQixzQkFXbEMsQ0FBQTtBQUNMLENBQUMsRUF0QmdCLFlBQVksR0FBWixvQkFBWSxLQUFaLG9CQUFZLFFBc0I1QjtBQUVELElBQUEsZ0NBQWlCLEVBQUMsWUFBWSxDQUFDLENBQUM7QUFFaEMsTUFBTSxVQUFVLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFbEQsY0FBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtJQUM1Qiw4QkFBOEI7SUFDOUIsSUFBSSxDQUFDLElBQUEsY0FBTSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUN2QixPQUFPO0tBQ1Y7SUFFRCwwQ0FBMEM7SUFDMUMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztJQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ3BCLE9BQU87S0FDVjtJQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUU5QixNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUN2QixJQUFJLE9BQU8sS0FBSyxTQUFTLElBQUksQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksc0JBQU0sQ0FBQyxZQUFZLEVBQUU7UUFDakUsZ0RBQWdEO1FBQ2hELE9BQU8sZUFBTSxDQUFDO0tBQ2pCO0lBRUQsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFMUIsTUFBTSxJQUFJLEdBQUcsbUJBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFakMsTUFBTSxHQUFHLEdBQUcsSUFBQSx3QkFBUyxFQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUU7UUFDbkMsR0FBRyxFQUFFLElBQUk7UUFDVCxNQUFNLEVBQUUsTUFBTTtRQUNkLElBQUksRUFBRSxFQUFFLENBQUMsU0FBUztLQUNyQixDQUFDLENBQUE7SUFFRixJQUFJLEdBQUcsRUFBRTtRQUNMLElBQUEsNkJBQWMsRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7S0FDdkM7SUFFRCxPQUFPLGVBQU0sQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyJ9