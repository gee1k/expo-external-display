import ExpoModulesCore
import UIKit

public class ExpoExternalDisplayModule: Module {
  private var didRegisterObservers = false

  public func definition() -> ModuleDefinition {
    Name("ExpoExternalDisplay")

    Events(
      "@ExpoExternalDisplay_screenDidConnect",
      "@ExpoExternalDisplay_screenDidChange",
      "@ExpoExternalDisplay_screenDidDisconnect"
    )

    Function("getConstants") {
      self.onMainActor {
        [
          "SCREEN_INFO": self.getScreenInfo()
        ] as [String: Any]
      }
    }

    Function("init") {
      self.onMainActor {
        self.registerObserversIfNeeded()
      }
    }

    Function("getInitialScreens") {
      self.onMainActor {
        ["SCREEN_INFO": self.getScreenInfo()]
      }
    }

    View(ExpoExternalDisplayView.self) {
      Prop("screen") { (view: ExpoExternalDisplayView, screen: String?) in
        view.screen = screen ?? ""
      }

      Prop("fallbackInMainScreen") { (view: ExpoExternalDisplayView, fallback: Bool?) in
        view.fallbackInMainScreen = fallback ?? false
      }
    }

    OnDestroy {
      NotificationCenter.default.removeObserver(self)
    }
  }

  private func onMainActor<T>(_ body: @MainActor () -> T) -> T {
    if Thread.isMainThread {
      return MainActor.assumeIsolated(body)
    }

    return DispatchQueue.main.sync {
      MainActor.assumeIsolated(body)
    }
  }

  @MainActor
  private func registerObserversIfNeeded() {
    if didRegisterObservers {
      return
    }
    didRegisterObservers = true

    let center = NotificationCenter.default
    center.addObserver(self, selector: #selector(handleScreenDidConnect), name: UIScreen.didConnectNotification, object: nil)
    center.addObserver(self, selector: #selector(handleScreenDidDisconnect), name: UIScreen.didDisconnectNotification, object: nil)
    center.addObserver(self, selector: #selector(handleScreenDidChange), name: UIDevice.orientationDidChangeNotification, object: nil)
  }

  @MainActor
  private func getScreenInfo() -> [String: Any] {
    var screenInfo: [String: Any] = [:]
    UIScreen.screens.enumerated().forEach { index, screen in
      guard screen != UIScreen.main else {
        return
      }
      screenInfo[String(index)] = [
        "id": index,
        "width": screen.bounds.width,
        "height": screen.bounds.height,
        "mirrored": screen.mirrored == UIScreen.main
      ]
    }
    return screenInfo
  }

  @objc private func handleScreenDidConnect() {
    onMainActor {
      sendEvent("@ExpoExternalDisplay_screenDidConnect", getScreenInfo())
    }
  }

  @objc private func handleScreenDidChange() {
    onMainActor {
      sendEvent("@ExpoExternalDisplay_screenDidChange", getScreenInfo())
    }
  }

  @objc private func handleScreenDidDisconnect() {
    onMainActor {
      sendEvent("@ExpoExternalDisplay_screenDidDisconnect", getScreenInfo())
    }
  }
}
