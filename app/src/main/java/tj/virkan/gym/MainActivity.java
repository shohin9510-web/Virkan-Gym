package tj.virkan.gym;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Local-only host. Web UI is copied from /web during the Gradle build. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/assets/web/index.html";
    private static final int OPEN_JSON = 101;
    private static final int SAVE_JSON = 102;
    private static final int MAX_JSON_BYTES = 5 * 1024 * 1024;
    private static final String TAG = "VirkanGym";

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private boolean pageReady;
    private boolean exportPending;
    private Boolean exportResult;
    private File pendingFile;

    @Override
    @SuppressLint("SetJavaScriptEnabled") // Only our packaged UI; all external URLs/frames are denied.
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        pendingFile = new File(getCacheDir(), "pending-export.json");
        exportPending = savedInstanceState != null && savedInstanceState.getBoolean("exportPending");

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(15, 17, 21));
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.requestApplyInsets();
        web.setBackgroundColor(Color.rgb(15, 17, 21));

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // User-selected JSON only, returned by the system picker.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setTextZoom(100);
        CookieManager.getInstance().setAcceptCookie(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                // Local subresources only. No remote fonts, analytics, trackers or app server.
                if (isLocal(uri) && "GET".equals(request.getMethod())) {
                    WebResourceResponse response = loader.shouldInterceptRequest(uri);
                    if (response != null) return response;
                }
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
                        Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Never expose the JS bridge to another document (even a local JSON file).
                return !HOME.equals(request.getUrl().toString().split("#", 2)[0]);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = HOME.equals(url.split("#", 2)[0]);
                if (!pageReady) return;
                deliverExportResult();
                web.evaluateJavascript("typeof HTMLDialogElement!=='undefined' && " +
                        "typeof HTMLDialogElement.prototype.showModal==='function'", result -> {
                    if ("false".equals(result) && !isFinishing()) {
                        new AlertDialog.Builder(MainActivity.this).setTitle("Обновите Android System WebView")
                                .setMessage("Для окон приложения нужен современный Android System WebView. " +
                                        "Обновите его и Chrome через магазин приложений, затем откройте Virkan Gym снова.")
                                .setPositiveButton("Понятно", null).show();
                    }
                });
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                if (BuildConfig.DEBUG && message.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                    // Do not log profile/backups or ordinary console messages.
                    Log.w(TAG, "Web UI error at line " + message.lineNumber());
                }
                return true;
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setTitle("Virkan Gym").setMessage(message)
                        .setPositiveButton("ОК", (d, w) -> result.confirm())
                        .setOnCancelListener(d -> result.cancel()).show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setTitle("Virkan Gym").setMessage(message)
                        .setPositiveButton("Продолжить", (d, w) -> result.confirm())
                        .setNegativeButton("Отмена", (d, w) -> result.cancel())
                        .setOnCancelListener(d -> result.cancel()).show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message,
                                      String defaultValue, JsPromptResult result) {
                EditText input = new EditText(MainActivity.this);
                input.setText(defaultValue);
                input.selectAll();
                new AlertDialog.Builder(MainActivity.this).setTitle(message).setView(input)
                        .setPositiveButton("Сохранить", (d, w) -> result.confirm(input.getText().toString()))
                        .setNegativeButton("Отмена", (d, w) -> result.cancel())
                        .setOnCancelListener(d -> result.cancel()).show();
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) { request.deny(); }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES,
                        new String[]{"application/json", "text/plain", "application/octet-stream"});
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try { startActivityForResult(intent, OPEN_JSON); }
                catch (ActivityNotFoundException ex) {
                    fileCallback.onReceiveValue(null); fileCallback = null;
                    message("На телефоне не найден выбор файлов.");
                }
                return true;
            }
        });
        web.addJavascriptInterface(new ExportBridge(), "VirkanNative");
        web.loadUrl(HOME);
    }

    private boolean isLocal(Uri uri) {
        String path = uri.getPath();
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && path != null && path.startsWith("/assets/web/") && !path.contains("..");
    }

    /** The only native operation exposed to our local top-level document is JSON export. */
    public final class ExportBridge {
        @JavascriptInterface
        public void saveBackup(String json, String filename) {
            if (json == null || json.length() > MAX_JSON_BYTES) {
                runOnUiThread(() -> { message("Копия превышает 5 МБ."); finishExport(false); });
                return;
            }
            try {
                JSONObject parsed = new JSONObject(json);
                if (!"Virkan Gym".equals(parsed.optString("app")) || !parsed.has("state")) {
                    throw new IllegalArgumentException("Not a Virkan backup");
                }
                byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
                if (bytes.length > MAX_JSON_BYTES) throw new IllegalArgumentException("Backup too large");
                String sanitized = filename == null ? "Virkan_Gym_backup.json"
                        : filename.replaceAll("[^a-zA-Z0-9_.-]", "_");
                final String safeName = sanitized.substring(0, Math.min(120, sanitized.length()));
                runOnUiThread(() -> prepareExport(bytes, safeName.endsWith(".json") ? safeName : safeName + ".json"));
            } catch (Exception ex) {
                runOnUiThread(() -> { message("Не удалось подготовить JSON-копию."); finishExport(false); });
            }
        }
    }

    private void prepareExport(byte[] bytes, String filename) {
        if (!pageReady || isFinishing() || exportPending) {
            message("Сначала завершите текущее сохранение."); return;
        }
        exportPending = true;
        io.execute(() -> {
            try (FileOutputStream out = new FileOutputStream(pendingFile)) {
                out.write(bytes);
                out.getFD().sync();
                runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    intent.putExtra(Intent.EXTRA_TITLE, filename);
                    try { startActivityForResult(intent, SAVE_JSON); }
                    catch (ActivityNotFoundException ex) {
                        message("На телефоне не найден диалог сохранения."); finishExport(false);
                    }
                });
            } catch (IOException ex) {
                runOnUiThread(() -> { message("Недостаточно места для создания копии."); finishExport(false); });
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OPEN_JSON) {
            if (fileCallback == null) return;
            Uri selected = resultCode == RESULT_OK && data != null ? data.getData() : null;
            if (!validImport(selected)) selected = null;
            fileCallback.onReceiveValue(selected == null ? null : new Uri[]{selected});
            fileCallback = null;
        } else if (requestCode == SAVE_JSON) {
            Uri destination = resultCode == RESULT_OK && data != null ? data.getData() : null;
            if (destination == null || !"content".equals(destination.getScheme()) || !pendingFile.isFile()) {
                finishExport(false); return;
            }
            io.execute(() -> {
                boolean ok = false;
                try (FileInputStream in = new FileInputStream(pendingFile);
                     OutputStream out = getContentResolver().openOutputStream(destination, "wt")) {
                    if (out == null) throw new IOException("No output stream");
                    byte[] buffer = new byte[8192]; int n;
                    while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
                    out.flush(); ok = true;
                } catch (IOException ex) { /* User receives a non-sensitive error message below. */ }
                final boolean succeeded = ok;
                runOnUiThread(() -> finishExport(succeeded));
            });
        }
    }

    private boolean validImport(Uri uri) {
        if (uri == null) return false;
        if (!"content".equals(uri.getScheme())) { message("Выберите JSON через системный выбор файлов."); return false; }
        // Only a user-selected provider URI; never a file: URL or our own private content.
        if (getPackageName().equals(uri.getAuthority())) return false;
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.SIZE}, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int i = c.getColumnIndex(OpenableColumns.SIZE);
                if (i >= 0 && !c.isNull(i) && c.getLong(i) > MAX_JSON_BYTES) {
                    message("Выберите JSON размером не более 5 МБ."); return false;
                }
            }
            return true; // app.js also checks File.size, JSON syntax and the complete schema.
        } catch (Exception ex) { message("Не удалось открыть выбранный файл."); return false; }
    }

    private void finishExport(boolean ok) {
        exportPending = false;
        if (pendingFile != null && pendingFile.exists() && !pendingFile.delete()) Log.w(TAG, "Pending backup cleanup deferred");
        exportResult = ok;
        deliverExportResult();
    }

    private void deliverExportResult() {
        if (!pageReady || web == null || exportResult == null || isDestroyed()) return;
        boolean ok = exportResult; exportResult = null;
        web.evaluateJavascript("window.virkanNativeExportFinished && window.virkanNativeExportFinished(" + ok + ")", null);
    }

    private void message(String text) { Toast.makeText(this, text, Toast.LENGTH_LONG).show(); }

    @Override
    public void onBackPressed() {
        if (web == null || !pageReady) { super.onBackPressed(); return; }
        web.evaluateJavascript("window.virkanHandleBack ? window.virkanHandleBack() : false", answer -> {
            if (!"true".equals(answer)) MainActivity.super.onBackPressed();
        });
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        out.putBoolean("exportPending", exportPending);
        super.onSaveInstanceState(out);
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
            web.evaluateJavascript("window.virkanOnResume && window.virkanOnResume()", null);
        }
    }
    @Override protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }
    @Override protected void onDestroy() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        if (web != null) {
            web.removeJavascriptInterface("VirkanNative");
            web.stopLoading(); web.destroy(); web = null;
        }
        io.shutdown();
        super.onDestroy();
    }
}
