---
title: "dev:web_api:v3:oauth [Zotero Documentation]"
source: "https://www.zotero.org/support/dev/web_api/v3/oauth"
author:
published:
created: 2025-02-27
description: "Zotero is a free, easy-to-use tool to help you collect, organize, cite, and share research."
tags:
  - "clippings"
---
## OAuth Key Exchange

In addition to users manually creating Zotero API keys from the zotero.org account settings, Zotero supports [OAuth](http://oauth.net/ "http://oauth.net/") 1.0a for API key exchange.

## Registering Your Application

In order to start using OAuth to create API keys on behalf of users, you must [register your application with Zotero](https://www.zotero.org/oauth/apps "/oauth/apps") to obtain a Client Key and Client Secret for use during all future OAuth handshakes between your application/website and zotero.org. Note that after you obtain an API key for a particular user these client credentials are not required for further Zotero API requests.

## Requesting Specific Permissions

You can request specific permissions be allowed for your app by sending values to the new key form as GET values in the URL during the OAuth exchange. The possible values to pre-populate for a user are:

- name (the description for the key)
- library\_access (1 or 0 - allow read access to personal library items)
- notes\_access (1 or 0 - allow read access to personal library notes)
- write\_access (1 or 0 - allow write access to personal library)
- all\_groups (none, read, or write - allow level of access to all current and future groups)
- identity=1 Don't create a key. Instead, use OAuth exchange only to get the user's identity information in order to do things that require no special permissions.

## Using OAuth Handshake for Key Exchange

The OAuth endpoints for access to the Zotero API are as follow:

Rather than using OAuth to sign each request, OAuth should be used to obtain a key for subsequent requests. The key will be valid indefinitely, unless it is revoked by the user manually, so keys should be considered sensitive. Note, however, that the Zotero API uses exclusively HTTPS requests, so ordinary traffic will not expose the key.

In addition to receiving the token, API consumers using OAuth will need to retrieve the user's user ID from the response parameters returned by Zotero.org.

### Example (PHP)

This PHP script demonstrates an implementation the application side of the OAuth handshake with zotero.org, using the API key thus obtained to make a request to the Zotero API.

```php
/** Note that this example uses the PHP OAuth extension http://php.net/manual/en/book.oauth.php
* but there are various PHP libraries that provide similar functionality.
*
* OAuth acts over multiple pages, so we save variables we need to remember in $state in a temp file
*
* The OAuth handshake has 3 steps:
* 1: Make a request to the provider to get a temporary token
* 2: Redirect user to provider with a reference to the temporary token. The provider will ask them to authorize it
* 3: When the user is sent back by the provider and the temporary token is authorized, exchange it for a permanent
*    token then save the permanent token for use in all future requests on behalf of this user.
*
* So an OAuth consumer needs to deal with 3 states which this example covers:
* State 0: We need to start a fresh OAuth handshake for a user to authorize us to get their information.
*         We get a request token from the provider and send the user off to authorize it
* State 1: The provider just sent the user back after they authorized the request token
*         We use the request token + secret we stored for this user and the verifier the provider just sent back to
*         exchange the request token for an access token.
* State 2: We have an access token stored for this user from a past handshake, so we use that to make data requests
*         to the provider.
**/
//initialize some variables to start with.
//clientkey, clientSecret, and callbackurl should correspond to http://www.zotero.org/oauth/apps
$clientKey = '9c6221a6ccae7639711a';
$clientSecret = '39091046dc9cf4dc3b61';
$callbackUrl = 'http://localhost/oauthtestentry.php';
//the endpoints are specific to the OAuth provider, in this case Zotero
$request_token_endpoint = 'https://www.zotero.org/oauth/request';
$access_token_endpoint = 'https://www.zotero.org/oauth/access';
$zotero_authorize_endpoint = 'https://www.zotero.org/oauth/authorize';
//Functions to save state to temp file between requests, DB should replace this functionality
function read_state(){
    return unserialize(file_get_contents('/tmp/oauthteststate'));
}
function write_state($state){
    file_put_contents('/tmp/oauthteststate', serialize($state));
}
function save_request_token($request_token_info, $state){
    // Make sure the request token has all the information we need
    if(isset($request_token_info['oauth_token']) && isset($request_token_info['oauth_token_secret'])){
        // save the request token for when the user comes back
        $state['request_token_info'] = $request_token_info;
        $state['oauthState'] = 1;
        write_state($state);
    }
    else{
        die("Request token did not return all the information we need.");
    }
}
function get_request_token($state){
    if($_GET['oauth_token'] != $state['request_token_info']['oauth_token']){
        die("Could not find referenced OAuth request token");
    }
    else{
        return $state['request_token_info'];
    }
}
function save_access_token($access_token_info, $state){
    if(!isset($access_token_info['oauth_token']) || !isset($access_token_info['oauth_token_secret'])){
        //Something went wrong with the access token request and we didn't get the information we need
        throw new Exception("OAuth access token did not contain expected information");
    }
    //we got the access token, so save it for future use
    $state['oauthState'] = 2;
    $state['access_token_info'] = $access_token_info;
    write_state($state); //save the access token for all subsequent resquests, in Zotero's case the token and secret are just the same Zotero API key
}
function get_access_token($state){
    if(empty($state['access_token_info'])){
        die("Could not retrieve access token from storage.");
    }
    return $state['access_token_info'];
}
//Initialize our environment
//check if there is a transaction in progress
//for testing purpose, start with a fresh state to perform a new handshake
if(empty($_GET['reset']) && file_exists('/tmp/oauthteststate')){
    $state = read_state();
}
else{
    $state = array();
    $state['localUser'] = 'localUserInformation';
    $state['oauthState'] = 0; //we do not have an oauth transaction in process yet
    write_state($state);
}
// If we are in state=1 there should be an oauth_token, if not go back to 0
if($state['oauthState'] == 1 && !isset($_GET['oauth_token'])){
    $state['oauthState'] = 0;
}
//Make sure we have OAuth installed depending on what library you're using
if(!class_exists('OAuth')){
    die("Class OAuth does not exist. Make sure PHP OAuth extension is installed and enabled.");
}
//set up a new OAuth object initialized with client credentials and methods accepted by the provider
$oauth = new OAuth($clientKey, $clientSecret, OAUTH_SIG_METHOD_HMACSHA1, OAUTH_AUTH_TYPE_FORM);
$oauth->enableDebug(); //get feedback if something goes wrong. Should not be used in production
//Handle different parts of the OAuth handshake depending on what state we're in
switch($state['oauthState']){
    case 0:
    // State 0 - Get request token from Zotero and redirect user to Zotero to authorize
    try{
        $request_token_info = $oauth->getRequestToken($request_token_endpoint, $callbackUrl);
    }
    catch(OAuthException $E){
        echo "Problem getting request token<br>";
        echo $E->lastResponse; echo "<br>";
        die;
    }
    save_request_token($request_token_info, $state);
 
    // Send the user off to the provider to authorize your request token
    // This could also be a link the user follows
    $redirectUrl = "{$zotero_authorize_endpoint}?oauth_token={$request_token_info['oauth_token']}";
    header('Location: ' . $redirectUrl);
    break;
    case 1:
    // State 1 - Handle callback from Zotero and get and store an access token
    // Make sure the token we got sent back matches the one we have
    // In practice we would look up the stored token and whatever local user information we have tied to it
    $request_token_info = get_request_token($state);
    //if we found the temp token, try to exchange it for a permanent one
    try{
        //set the token we got back from the provider and the secret we saved previously for the exchange.
        $oauth->setToken($_GET['oauth_token'], $request_token_info['oauth_token_secret']);
        //make the exchange request to the provider's given endpoint
        $access_token_info = $oauth->getAccessToken($access_token_endpoint);
        save_access_token($access_token_info, $state);
    }
    catch(Exception $e){
        //Handle error getting access token
        die("Caught exception on access token request");
    }
    // Continue on to authorized state outside switch
    break;
    case 2:
    //get previously stored access token if we didn't just get it from a handshack
    $access_token_info = get_access_token($state);
    break;
}
// State 2 - Authorized. We have an access token stored already which we can use for requests on behalf of this user
echo "Have access token for user.";
//zotero will send the userID associated with the key along too
$zoteroUserID = $access_token_info['userID'];
//Now we can use the token secret the same way we already used a Zotero API key
$zoteroApiKey = $access_token_info['oauth_token_secret'];
$feed = file_get_contents("https://api.zotero.org/users/{$zoteroUserID}/items?limit=1&key={$zoteroApiKey}");
var_dump($state);
echo "<pre>" . htmlentities($feed) . "</pre>";
/** OAuth support for all api requests may be added in the future
* but for now secure https provides similar benefits anyway
*/
```