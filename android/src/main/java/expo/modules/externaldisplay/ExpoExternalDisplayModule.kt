package expo.modules.externaldisplay

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoExternalDisplayModule : Module() {
  private var helper: ExternalDisplayHelper? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoExternalDisplay")

    Events(
      "@ExpoExternalDisplay_screenDidConnect",
      "@ExpoExternalDisplay_screenDidChange",
      "@ExpoExternalDisplay_screenDidDisconnect"
    )

    Function("getConstants") {
      mapOf(
        "SCREEN_INFO" to getScreenInfo()
      )
    }

    Function("init") {
      ensureHelper()
    }

    Function("getInitialScreens") {
      mapOf("SCREEN_INFO" to getScreenInfo())
    }

    View(ExpoExternalDisplayView::class) {
      Prop("screen") { view: ExpoExternalDisplayView, screen: String? ->
        view.setScreen(screen)
      }

      Prop("fallbackInMainScreen") { view: ExpoExternalDisplayView, fallback: Boolean? ->
        view.setFallbackInMainScreen(fallback == true)
      }

      GroupView {
        AddChildView { parent: ExpoExternalDisplayView, child: android.view.View, index: Int ->
          parent.addExternalDisplayChild(child, index)
        }

        GetChildCount { parent: ExpoExternalDisplayView ->
          parent.externalDisplayChildCount
        }

        GetChildViewAt<android.view.View> { parent: ExpoExternalDisplayView, index: Int ->
          parent.getExternalDisplayChildAt(index)
        }

        RemoveChildView { parent: ExpoExternalDisplayView, child: android.view.View ->
          parent.removeExternalDisplayChild(child)
        }

        RemoveChildViewAt { parent: ExpoExternalDisplayView, index: Int ->
          parent.removeExternalDisplayChildAt(index)
        }
      }

      OnViewDestroys { view: ExpoExternalDisplayView ->
        view.cleanup()
      }
    }

    OnDestroy {
      helper?.dispose()
      helper = null
    }
  }

  private fun ensureHelper(): ExternalDisplayHelper {
    val context = appContext.reactContext ?: appContext.currentActivity
    requireNotNull(context) { "No Android context available for ExpoExternalDisplay" }

    return helper ?: ExternalDisplayHelper(context.applicationContext, object : ExternalDisplayHelper.Listener {
      override fun onDisplayAdded() {
        sendEvent("@ExpoExternalDisplay_screenDidConnect", getScreenInfo())
      }

      override fun onDisplayChanged() {
        sendEvent("@ExpoExternalDisplay_screenDidChange", getScreenInfo())
      }

      override fun onDisplayRemoved() {
        sendEvent("@ExpoExternalDisplay_screenDidDisconnect", getScreenInfo())
      }
    }).also {
      helper = it
      ExpoExternalDisplayView.helperProvider = { it }
    }
  }

  private fun getScreenInfo(): Map<String, Any?> {
    return ensureHelper().getScreenInfo()
  }
}
