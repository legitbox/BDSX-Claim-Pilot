"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SneakToggleEvent = void 0;
const eventStorage_1 = require("./eventStorage");
const event_1 = require("bdsx/event");
var SneakToggleEvent;
(function (SneakToggleEvent) {
    SneakToggleEvent.ID = 'SneakToggleEvent';
    SneakToggleEvent.CANCELABLE = false;
    SneakToggleEvent.ASYNC_ALLOWED = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(SneakToggleEvent.ID, callback);
    }
    SneakToggleEvent.register = register;
    async function handleFireCallbacks(callbacks, data) {
        for (const callback of callbacks) {
            const callbackResult = callback(data.playerXuid);
            if (callbackResult instanceof Promise) {
                await callbackResult;
            }
        }
    }
    SneakToggleEvent.handleFireCallbacks = handleFireCallbacks;
})(SneakToggleEvent = exports.SneakToggleEvent || (exports.SneakToggleEvent = {}));
(0, eventStorage_1.registerEventType)(SneakToggleEvent);
event_1.events.entitySneak.on(async (ev) => {
    if (ev.entity.isPlayer() && !ev.isSneaking) {
        const eventRes = (0, eventStorage_1.fireEvent)(SneakToggleEvent.ID, { playerXuid: ev.entity.getXuid() });
        if (typeof eventRes !== "boolean") {
            await eventRes;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25lYWtUb2dnbGVFdmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNuZWFrVG9nZ2xlRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsaURBQTJFO0FBQzNFLHNDQUFrQztBQUVsQyxJQUFpQixnQkFBZ0IsQ0FrQmhDO0FBbEJELFdBQWlCLGdCQUFnQjtJQUNoQixtQkFBRSxHQUFHLGtCQUFrQixDQUFDO0lBQ3hCLDJCQUFVLEdBQUcsS0FBSyxDQUFDO0lBQ25CLDhCQUFhLEdBQUcsSUFBSSxDQUFDO0lBR2xDLFNBQWdCLFFBQVEsQ0FBQyxRQUFrQjtRQUN2QyxJQUFBLDRCQUFhLEVBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFGZSx5QkFBUSxXQUV2QixDQUFBO0lBRU0sS0FBSyxVQUFVLG1CQUFtQixDQUFDLFNBQXFCLEVBQUUsSUFBUztRQUN0RSxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtZQUM5QixNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pELElBQUksY0FBYyxZQUFZLE9BQU8sRUFBRTtnQkFDbkMsTUFBTSxjQUFjLENBQUM7YUFDeEI7U0FDSjtJQUNMLENBQUM7SUFQcUIsb0NBQW1CLHNCQU94QyxDQUFBO0FBQ0wsQ0FBQyxFQWxCZ0IsZ0JBQWdCLEdBQWhCLHdCQUFnQixLQUFoQix3QkFBZ0IsUUFrQmhDO0FBRUQsSUFBQSxnQ0FBaUIsRUFBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRXBDLGNBQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUMvQixJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFO1FBQ3hDLE1BQU0sUUFBUSxHQUFHLElBQUEsd0JBQVMsRUFBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBQyxDQUFDLENBQUM7UUFDbkYsSUFBSSxPQUFPLFFBQVEsS0FBSyxTQUFTLEVBQUU7WUFDL0IsTUFBTSxRQUFRLENBQUM7U0FDbEI7S0FDSjtBQUNMLENBQUMsQ0FBQyxDQUFBIn0=