(function (DB, $) {
    var subscriber;
    UIK.subscriber = {};
    subscriber = UIK.subscriber;

    $.extend(UIK.subscriber, {
        isLog: false,
        routes: {},
        $document: $(document),


        subscribe: function (channel, callback, context) {
            var route = {
                callback: callback,
                context: context
            };

            if (!subscriber.routes[channel]) {
                subscriber.routes[channel] = [route];
            } else {
                subscriber.routes[channel].push(route);
            }
        },


        publish: function (channel, parameters) {
            var route,
                callbackIndex = 0,
                callbackCount;

            parameters = parameters || [];
            subscriber.trigger(channel, parameters);
            if (!subscriber.routes.hasOwnProperty(channel)) {
                return false;
            }

            for (callbackIndex, callbackCount = subscriber.routes[channel].length;
                    callbackIndex < callbackCount; callbackIndex += 1) {
                route = subscriber.routes[channel][callbackIndex];
                route.callback.apply(route.context, parameters);
            }
        },


        unsubscribe: function (channel) {
            delete subscriber.routes[channel];
        },


        call: function (channel, parameters) {
            parameters = parameters || [];
            if (!subscriber.routes.hasOwnProperty(channel)) {
                return false;
            }

            var route = subscriber.routes[channel][0];
            return route.callback.apply(route.context, parameters);
        },


        trigger: function (channel, parameters) {
            parameters = parameters || [];
            subscriber.$document.trigger(channel, parameters);
        }
    });

    UIK.subscribe = UIK.subscriber.subscribe;
    UIK.unsubscribe = UIK.subscriber.unsubscribe;
    UIK.publish = UIK.subscriber.publish;
    UIK.call = UIK.subscriber.call;
    UIK.trigger = UIK.subscriber.trigger;

}) (UIK, jQuery);