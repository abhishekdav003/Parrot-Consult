# Add project specific ProGuard rules here.

# ====================================================================
# OPTIMIZATION SETTINGS (CRITICAL FOR SIZE REDUCTION)
# ====================================================================

# Maximum optimization passes for best size reduction
-optimizationpasses 5
-allowaccessmodification
-dontpreverify

# Aggressive optimization (reduces size significantly)
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*

# Remove all logging in production (reduces size by 5-10%)
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# Remove debug-only code
-assumenosideeffects class kotlin.jvm.internal.Intrinsics {
    static void checkParameterIsNotNull(java.lang.Object, java.lang.String);
}

# ====================================================================
# KEEP ESSENTIAL CLASSES (DO NOT MODIFY)
# ====================================================================

# Keep attributes for better optimization and debugging
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes SourceFile,LineNumberTable

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.views.** { *; }

# CRITICAL: Keep Agora SDK classes (ESSENTIAL FOR VIDEO CALLS)
-keep class io.agora.** { *; }
-keep class io.agora.rtc.** { *; }
-keep class io.agora.rtc2.** { *; }
-keep class io.agora.base.** { *; }
-keep class io.agora.rtc2.internal.** { *; }
-dontwarn io.agora.**

# Keep react-native-agora classes
-keep class com.syan.agora.** { *; }
-keep interface com.syan.agora.** { *; }
-keepclassmembers class com.syan.agora.** { *; }

# Keep react-native-video classes (CRITICAL FOR VIDEO PLAYBACK)
-keep class com.brentvatne.** { *; }
-keep class com.google.android.exoplayer2.** { *; }
-keepclassmembers class com.brentvatne.** { *; }
-dontwarn com.google.android.exoplayer2.**

# Keep vector icons
-keep class com.oblador.vectoricons.** { *; }

# Keep linear gradient
-keep class com.BV.LinearGradient.** { *; }

# Keep Razorpay SDK
-keep class com.razorpay.** { *; }
-keepclassmembers class com.razorpay.** { *; }
-dontwarn com.razorpay.**

# Keep blob util
-keep class com.ReactNativeBlobUtil.** { *; }

# Keep image picker
-keep class com.imagepicker.** { *; }

# Keep AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Keep socket.io client
-keep class io.socket.** { *; }
-keep class io.socket.client.** { *; }
-keep class io.socket.engineio.** { *; }
-keepclassmembers class io.socket.** { *; }
-dontwarn io.socket.**

# ====================================================================
# ANDROID SYSTEM CLASSES
# ====================================================================

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
    **[] $VALUES;
    public *;
}

# Keep Parcelables
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# CRITICAL: Keep video call related classes
-keep class android.media.** { *; }
-keep class android.hardware.camera2.** { *; }
-keep class android.opengl.** { *; }

# ====================================================================
# NETWORKING & JSON
# ====================================================================

# OkHttp
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Gson
-keepattributes Signature
-keep class com.google.gson.** { *; }
-keep class sun.misc.Unsafe { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# ====================================================================
# ADDITIONAL OPTIMIZATIONS
# ====================================================================

# Remove unnecessary resources (handled by shrinkResources)
-keep class **.R
-keep class **.R$* {
    <fields>;
}

# Dontwarn for third-party libraries
-dontwarn com.facebook.react.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn java.lang.instrument.ClassFileTransformer
-dontwarn sun.misc.SignalHandler

# ====================================================================
# IMPORTANT PRODUCTION NOTES
# ====================================================================
# 1. This configuration is optimized for maximum size reduction
# 2. Always test thoroughly after enabling ProGuard
# 3. If app crashes after ProGuard, check logcat for ClassNotFoundException
# 4. Add specific -keep rules for any missing classes
# 5. Monitor crash reports after release