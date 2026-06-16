package expo.modules.externaldisplay

import android.annotation.TargetApi
import android.app.Presentation
import android.content.Context
import android.hardware.display.DisplayManager
import android.os.Build
import android.os.Bundle
import android.view.Display
import android.util.DisplayMetrics

@TargetApi(Build.VERSION_CODES.JELLY_BEAN_MR1)
class ExternalDisplayScreen(context: Context, display: Display) : Presentation(context, display) {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
  }
}

@TargetApi(Build.VERSION_CODES.JELLY_BEAN_MR1)
class ExternalDisplayHelper(
  context: Context,
  private val listener: Listener
) : DisplayManager.DisplayListener {
  interface Listener {
    fun onDisplayAdded()
    fun onDisplayChanged()
    fun onDisplayRemoved()
  }

  private val displayManager =
    context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager

  init {
    displayManager.registerDisplayListener(this, null)
  }

  fun dispose() {
    displayManager.unregisterDisplayListener(this)
  }

  fun getDisplay(displayId: Int): Display? = displayManager.getDisplay(displayId)

  fun getPresentationDisplays(): Array<Display> =
    displayManager.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION)

  fun getScreenInfo(): Map<String, Any?> = getScreenInfo(getPresentationDisplays())

  override fun onDisplayAdded(displayId: Int) {
    listener.onDisplayAdded()
  }

  override fun onDisplayChanged(displayId: Int) {
    listener.onDisplayChanged()
  }

  override fun onDisplayRemoved(displayId: Int) {
    listener.onDisplayRemoved()
  }

  companion object {
    fun getScreenInfo(displays: Array<Display>): Map<String, Any?> {
      return displays
        .filter { display ->
          display.displayId != Display.DEFAULT_DISPLAY &&
            display.flags and Display.FLAG_PRESENTATION != 0
        }
        .associate { display ->
          val metrics = DisplayMetrics()
          display.getMetrics(metrics)
          display.displayId.toString() to mapOf(
            "id" to display.displayId,
            "width" to metrics.widthPixels,
            "height" to metrics.heightPixels
          )
        }
    }
  }
}
