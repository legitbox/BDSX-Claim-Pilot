"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupCreatedEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var GroupCreatedEvent;
(function (GroupCreatedEvent) {
    GroupCreatedEvent.ID = 'GroupCreatedEvent';
    GroupCreatedEvent.CANCELABLE = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(GroupCreatedEvent.ID, callback);
    }
    GroupCreatedEvent.register = register;
    function handleFireCallbacks(callbacks, data) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const res = callback(data.group, data.ownerXuid);
            if (!res) {
                shouldExecute = false;
            }
        }
        return shouldExecute;
    }
    GroupCreatedEvent.handleFireCallbacks = handleFireCallbacks;
})(GroupCreatedEvent = exports.GroupCreatedEvent || (exports.GroupCreatedEvent = {}));
(0, eventStorage_1.registerEventType)(GroupCreatedEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JvdXBDcmVhdGVkRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJncm91cENyZWF0ZWRFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpREFBZ0U7QUFFaEUsSUFBaUIsaUJBQWlCLENBb0JqQztBQXBCRCxXQUFpQixpQkFBaUI7SUFDakIsb0JBQUUsR0FBRyxtQkFBbUIsQ0FBQztJQUN6Qiw0QkFBVSxHQUFHLElBQUksQ0FBQztJQUcvQixTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDdkMsSUFBQSw0QkFBYSxFQUFDLGtCQUFBLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRmUsMEJBQVEsV0FFdkIsQ0FBQTtJQUVELFNBQWdCLG1CQUFtQixDQUFDLFNBQXFCLEVBQUUsSUFBUztRQUNoRSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDekIsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUU7WUFDOUIsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ04sYUFBYSxHQUFHLEtBQUssQ0FBQzthQUN6QjtTQUNKO1FBRUQsT0FBTyxhQUFhLENBQUM7SUFDekIsQ0FBQztJQVZlLHFDQUFtQixzQkFVbEMsQ0FBQTtBQUNMLENBQUMsRUFwQmdCLGlCQUFpQixHQUFqQix5QkFBaUIsS0FBakIseUJBQWlCLFFBb0JqQztBQUVELElBQUEsZ0NBQWlCLEVBQUMsaUJBQWlCLENBQUMsQ0FBQyJ9