package shop.mergeos.mrgwallet

import android.annotation.SuppressLint
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
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.statusBarColor = Color.parseColor("#0B1020")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        }

        val web = WebView(this)
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
        web.loadUrl("file:///android_asset/www/index.html")

        val swipeRefresh = SwipeRefreshLayout(this).apply {
            setColorSchemeColors(Color.parseColor("#7C5CFF"), Color.WHITE)
            setProgressBackgroundColorSchemeColor(Color.parseColor("#0B1020"))
            setOnRefreshListener { web.reload() }
            addView(web)
        }
        setContentView(swipeRefresh)
    }
}
