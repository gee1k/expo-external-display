import ExpoModulesCore
import UIKit

final class ExpoExternalDisplayView: ExpoView {
  private var externalWindow: UIWindow?
  private var storedSubviews: [UIView] = []
  private var isMovingStoredSubviews = false

  var screen: String = "" {
    didSet {
      if oldValue != screen {
        invalidateWindow()
      }
      updateScreen()
    }
  }

  var fallbackInMainScreen: Bool = false {
    didSet {
      updateScreen()
    }
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
  }

  override func didAddSubview(_ subview: UIView) {
    super.didAddSubview(subview)
    if !storedSubviews.contains(subview) {
      storedSubviews.append(subview)
    }
    updateScreen()
  }

  override func willRemoveSubview(_ subview: UIView) {
    super.willRemoveSubview(subview)
    if !isMovingStoredSubviews {
      storedSubviews.removeAll { $0 === subview }
    }
  }

  override func removeFromSuperview() {
    cleanup()
    super.removeFromSuperview()
  }

  deinit {
    cleanup()
  }

  func cleanup() {
    isMovingStoredSubviews = true
    storedSubviews.forEach { subview in
      subview.removeFromSuperview()
    }
    isMovingStoredSubviews = false
    storedSubviews.removeAll()
    invalidateWindow()
  }

  private func updateScreen() {
    guard !storedSubviews.isEmpty else {
      invalidateWindow()
      return
    }

    if let window = targetWindow() {
      let rootView = window.rootViewController?.view
      isMovingStoredSubviews = true
      storedSubviews.enumerated().forEach { index, subview in
        subview.removeFromSuperview()
        rootView?.insertSubview(subview, at: index)
      }
      isMovingStoredSubviews = false
      window.makeKeyAndVisible()
      return
    }

    invalidateWindow()

    if fallbackInMainScreen {
      isMovingStoredSubviews = true
      storedSubviews.enumerated().forEach { index, subview in
        if subview.superview !== self {
          subview.removeFromSuperview()
          insertSubview(subview, at: index)
        }
      }
      isMovingStoredSubviews = false
    }
  }

  private func targetWindow() -> UIWindow? {
    guard !screen.isEmpty else {
      return nil
    }

    return targetScreenWindow()
  }

  private func targetScreenWindow() -> UIWindow? {
    guard let index = Int(screen), index > 0, index < UIScreen.screens.count else {
      return nil
    }

    let targetScreen = UIScreen.screens[index]
    if externalWindow == nil {
      externalWindow = UIWindow(frame: targetScreen.bounds)
      ensureRootViewController()
    }
    externalWindow?.screen = targetScreen
    return externalWindow
  }

  private func ensureRootViewController() {
    guard let window = externalWindow, window.rootViewController == nil else {
      return
    }
    let controller = UIViewController()
    controller.view = UIView(frame: window.bounds)
    controller.view.backgroundColor = .black
    window.rootViewController = controller
  }

  private func invalidateWindow() {
    externalWindow?.rootViewController?.view.subviews.forEach { subview in
      if storedSubviews.contains(where: { $0 === subview }) {
        subview.removeFromSuperview()
      }
    }
    externalWindow?.isHidden = true
    externalWindow = nil
  }
}
