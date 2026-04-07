import Capacitor
import Foundation
import WidgetKit

/// Simple plugin that writes bag JSON into the shared App Group UserDefaults
/// so the BagWidget can read it without a network call.
@objc(BagBridgePlugin)
public class BagBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier   = "BagBridgePlugin"
    public let jsName       = "BagBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise)
    ]

    @objc func save(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("Missing json parameter")
            return
        }
        if let defaults = UserDefaults(suiteName: "group.com.zerobreakgolf.shared") {
            defaults.set(json, forKey: "bagData")
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        } else {
            call.reject("App Group not configured — add group.com.zerobreakgolf.shared entitlement")
        }
    }
}
