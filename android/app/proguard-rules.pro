# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep react-native-video classes (CRITICAL FOR VIDEO PLAYBACK)
-keep class com.brentvatne.** { *; }
-keep class com.google.android.exoplayer2.** { *; }
-keepclassmembers class com.brentvatne.** { *; }

# Keep vector icons
-keep class com.oblador.vectoricons.** { *; }

# Keep linear gradient
-keep class com.BV.LinearGradient.** { *; }

# Keep Razorpay
-keep class com.razorpay.** { *; }

# Keep blob util
-keep class com.ReactNativeBlobUtil.** { *; }

# Keep image picker
-keep class com.imagepicker.** { *; }

# Keep AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Keep socket.io
-keep class io.socket.** { *; }

# Preserve line numbers for debugging
-keepattributes SourceFile,LineNumberTable

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
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

# Dontwarn warnings
-dontwarn com.facebook.react.**
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**

# Keep JavaScript interface for debugging
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Optimization settings
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification

# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}