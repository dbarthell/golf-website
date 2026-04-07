import UIKit
import Capacitor
import WidgetKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Give the Capacitor WebView a moment to finish loading before we
        // evaluate JavaScript to pull bag data from localStorage.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            self.syncBagDataToWidget()
        }
    }

    // ── Bag → Widget sync ─────────────────────────────────────────────────────
    // Reads the "bag-data" key directly from the WebView's localStorage and
    // writes it into the shared App Group so the widget can display it.
    // This bypasses the Capacitor JS bridge and is more reliable on cold launch.

    private func syncBagDataToWidget() {
        guard
            let webView = capWebView(),
            let defaults = UserDefaults(suiteName: "group.com.zerobreakgolf.shared")
        else {
            NSLog("ZeroBreak: App Group or WebView not available for bag sync")
            return
        }

        webView.evaluateJavaScript("localStorage.getItem('bag-data')") { result, error in
            if let error = error {
                NSLog("ZeroBreak: JS eval error — %@", error.localizedDescription)
                return
            }
            guard let json = result as? String, !json.isEmpty else {
                NSLog("ZeroBreak: bag-data is empty in localStorage")
                return
            }
            defaults.set(json, forKey: "bagData")
            NSLog("ZeroBreak: bag-data synced to App Group (%d chars)", json.count)
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    private func capWebView() -> WKWebView? {
        guard let rootVC = window?.rootViewController else { return nil }
        return findWebView(in: rootVC)
    }

    private func findWebView(in vc: UIViewController) -> WKWebView? {
        if let cap = vc as? CAPBridgeViewController {
            return cap.bridge?.webView
        }
        for child in vc.children {
            if let found = findWebView(in: child) { return found }
        }
        if let presented = vc.presentedViewController {
            return findWebView(in: presented)
        }
        return nil
    }

    // ── Standard Capacitor delegate forwarding ────────────────────────────────

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
