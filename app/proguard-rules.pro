# Keep this rule if minification is enabled later.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
