// Copyright 2015-present 650 Industries. All rights reserved.

#import "AppDelegate.h"
#import "ExpoKit.h"
#import "EXViewController.h"
#import <Firebase.h>
#import <FBSDKCoreKit/FBSDKCoreKit.h>
#import <Crashlytics/Crashlytics.h>
#import "RNFirebaseLinks.h"
#import "RCTPushNotificationManager.h"
#import <UserNotifications/UserNotifications.h>
#import "RNBranch.h"

@interface AppDelegate ()

@property (nonatomic, strong) EXViewController *rootViewController;

@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    [FIROptions defaultOptions].deepLinkURLScheme = @"org.auderenow.fluathome.dynlink";
    [FIRApp configure];
    [[FBSDKApplicationDelegate sharedInstance] application:application
                             didFinishLaunchingWithOptions:launchOptions];
    [[ExpoKit sharedInstance] application:application didFinishLaunchingWithOptions:launchOptions];
    _rootViewController = [ExpoKit sharedInstance].rootViewController;
    
    bool handled = [super application:application didFinishLaunchingWithOptions:launchOptions];
    
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    center.delegate = self;
    
    [RNBranch initSessionWithLaunchOptions:launchOptions isReferrable:YES];
    
    return handled;
}

- (void)applicationWillEnterForeground:(UIApplication *)application
{
    [FBSDKAppEvents activateApp];
    
    // Uncomment below if you'd like to force a crash to see if it'll show up in Crashlytics on Firebase.
    // Yes, the rand bit is lame -- you should feel free to use your own method.  But basically, after
    // a crash, you need a way to get the app to run again WITHOUT crashing, at least during launch,
    // in order for Crashlytics to upload its data.  If you simply change the code and rebuild, Xcode
    // will redeploy, thereby deleting your crash data (from device or simulator).
    //
    // int r = arc4random_uniform(2);
    // if (r != 0) {
    //  [[Crashlytics sharedInstance] crash];
    // }
    [super applicationWillEnterForeground:application];
}

#pragma mark - Background Fetch

- (void)application:(UIApplication *)application performFetchWithCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
    [super application:application performFetchWithCompletionHandler:completionHandler];
}

#pragma mark - Handling URLs
- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
    BOOL handled = [RNBranch continueUserActivity:userActivity];

    if (!handled) {
        handled = [[RNFirebaseLinks instance] application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
    }
    if (!handled) {
        handled = [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
    }
    return handled;
}

- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
    BOOL handled = [[FBSDKApplicationDelegate sharedInstance] application:app
                                                                  openURL:url
                                                        sourceApplication:options[UIApplicationOpenURLOptionsSourceApplicationKey]
                                                               annotation:options[UIApplicationOpenURLOptionsAnnotationKey]
                    ];
    
    if (!handled) {
        handled = [RNBranch.branch application:app openURL:url options:options];
    }

    if (!handled) {
        handled = [[RNFirebaseLinks instance] application:app openURL:url options:options];
    }

    if (!handled) {
        handled = [super application:app openURL:url options:options];
    }

    return handled;
}

#pragma mark - Notifications
// Required for the register event.
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
    [RCTPushNotificationManager didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// Required for the registrationError event.
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
    [RCTPushNotificationManager didFailToRegisterForRemoteNotificationsWithError:error];
}

// Required to register for notifications
- (void)application:(UIApplication *)application didRegisterUserNotificationSettings:(UIUserNotificationSettings *)notificationSettings
{
    [RCTPushNotificationManager didRegisterUserNotificationSettings:notificationSettings];
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void (^)(void))completionHandler {

    UILocalNotification *notification = [[UILocalNotification alloc] init];
    notification.fireDate = nil;
    notification.timeZone = [NSTimeZone systemTimeZone];
    notification.alertBody = response.notification.request.content.body;
    notification.soundName = nil;
    notification.applicationIconBadgeNumber = nil;
    notification.userInfo = response.notification.request.content.userInfo;
    
    if([[UIApplication sharedApplication] applicationState] == UIApplicationStateInactive ||
       [[UIApplication sharedApplication] applicationState] == UIApplicationStateBackground) {
        notification.category = @"Background";
    } else {
        notification.category = @"Foreground";
    }
    
    [RCTPushNotificationManager didReceiveLocalNotification:notification];
}

- (void)userNotificationCenter:(UNUserNotificationCenter* )center
       willPresentNotification:(UNNotification* )notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler {
    completionHandler(UNNotificationPresentationOptionSound | UNNotificationPresentationOptionAlert);
}

@end
