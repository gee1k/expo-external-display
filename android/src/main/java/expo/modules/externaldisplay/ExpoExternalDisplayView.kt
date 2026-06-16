package expo.modules.externaldisplay

import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import expo.modules.core.interfaces.LifecycleEventListener
import expo.modules.core.interfaces.services.UIManager
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class ExpoExternalDisplayView(
  context: Context,
  private val moduleAppContext: AppContext
) : ExpoView(context, moduleAppContext), LifecycleEventListener {
  private val children = mutableListOf<View>()
  private var displayScreen: ExternalDisplayScreen? = null
  private var presentationContainer: FrameLayout? = null
  private var screen = -1
  private var fallbackInMainScreen = false
  private var pausedWithDisplayScreen = false
  private val uiManager = moduleAppContext.legacyModule<UIManager>()

  init {
    uiManager?.registerLifecycleEventListener(this)
  }

  val externalDisplayChildCount: Int
    get() = children.size

  fun getExternalDisplayChildAt(index: Int): View? = children.getOrNull(index)

  fun addExternalDisplayChild(child: View, index: Int) {
    children.add(index.coerceIn(0, children.size), child)
    updateScreen()
  }

  fun removeExternalDisplayChild(child: View) {
    children.remove(child)
    detachChild(child)
  }

  fun removeExternalDisplayChildAt(index: Int) {
    children.getOrNull(index)?.let { child ->
      children.removeAt(index)
      detachChild(child)
    }
  }

  fun setScreen(nextScreen: String?) {
    val parsed = nextScreen?.toIntOrNull() ?: -1
    if (parsed != screen) {
      destroyScreen()
    }
    screen = parsed
    updateScreen()
  }

  fun setFallbackInMainScreen(value: Boolean) {
    fallbackInMainScreen = value
    updateScreen()
  }

  fun cleanup() {
    uiManager?.unregisterLifecycleEventListener(this)
    children.toList().forEach(::detachChild)
    children.clear()
    destroyScreen()
  }

  override fun onHostResume() {
    if (!pausedWithDisplayScreen) {
      return
    }
    pausedWithDisplayScreen = false
    updateScreen()
  }

  override fun onHostPause() {
    if (displayScreen == null) {
      return
    }
    pausedWithDisplayScreen = true
    destroyScreen()
  }

  override fun onHostDestroy() {
    cleanup()
  }

  private fun updateScreen() {
    if (children.isEmpty()) {
      return
    }

    val helper = helperProvider?.invoke()
    val display = if (screen > 0) helper?.getDisplay(screen) else null

    if (display != null) {
      val currentScreen = displayScreen ?: ExternalDisplayScreen(context, display).also {
        displayScreen = it
        presentationContainer = FrameLayout(context)
      }
      val container = requireNotNull(presentationContainer)
      container.removeAllViews()
      children.forEachIndexed { index, child ->
        detachChild(child)
        container.addView(child, index, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
      }
      currentScreen.setContentView(container)
      if (!currentScreen.isShowing) {
        currentScreen.show()
      }
      return
    }

    destroyScreen()

    if (fallbackInMainScreen) {
      children.forEachIndexed { index, child ->
        detachChild(child)
        super.addView(child, index, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
      }
    }
  }

  private fun destroyScreen() {
    presentationContainer?.removeAllViews()
    displayScreen?.dismiss()
    displayScreen = null
    presentationContainer = null
  }

  private fun detachChild(child: View) {
    (child.parent as? ViewGroup)?.removeView(child)
  }

  companion object {
    var helperProvider: (() -> ExternalDisplayHelper)? = null
  }
}
