package shop.mergeos.mrgwallet

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.statusBarColor = Color.parseColor("#0B1020")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        }

        web = WebView(this)
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipeRefresh.isRefreshing = false
            }
        }
        web.webChromeClient = WebChromeClient()
        val settings: WebSettings = web.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true

        swipeRefresh = SwipeRefreshLayout(this).apply {
            setColorSchemeColors(Color.parseColor("#7C5CFF"), Color.WHITE)
            setProgressBackgroundColorSchemeColor(Color.parseColor("#0B1020"))
            setOnRefreshListener { web.reload() }
            addView(web)
        }
        setContentView(swipeRefresh)

        // Resolve initial URL from deep link or fallback to default
        web.loadUrl(resolveStartUrl(intent))
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Re-launch from a deep link while activity already exists
        val url = resolveStartUrl(intent)
        if (url != web.url) {
            web.loadUrl(url)
        }
    }

    private fun resolveStartUrl(intent: Intent?): String {
        val defaultUrl = "file:///android_asset/www/index.html"
        val data = intent?.data ?: return defaultUrl

        // Accept: mrgwallet://claim?task_id=<id>
        if (data.scheme == "mrgwallet" && data.host == "claim") {
            val taskId = data.getQueryParameter("task_id")
            if (!taskId.isNullOrBlank()) {
                return "file:///android_asset/www/index.html?task_id=${java.net.URLEncoder.encode(taskId, "UTF-8")}"
            }
        }
        return defaultUrl
    }
}
