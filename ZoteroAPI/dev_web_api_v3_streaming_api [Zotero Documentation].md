---
title: "dev:web_api:v3:streaming_api [Zotero Documentation]"
source: "https://www.zotero.org/support/dev/web_api/v3/streaming_api"
author:
published:
created: 2025-02-27
description: "Zotero is a free, easy-to-use tool to help you collect, organize, cite, and share research."
tags:
  - "clippings"
---
## Zotero Streaming API

The Zotero streaming API provides push-based notifications via WebSockets for Zotero library changes, allowing for nearly instantaneous updates when data changes in a library or when a user joins or leaves a library.

Note that this API provides library-level notifications of changes. It does not provide updated data directly. API consumers that receive notification of a library change should use their standard [sync process](https://www.zotero.org/support/dev/web_api/v3/syncing "dev:web_api:v3:syncing") to retrieve data, ensuring a single, consistent code path for both manual and automatic syncing.

To avoid missed updates, clients should connect to the streaming API and then, once connected, trigger a standard sync operation to bring themselves up to date with the current version of a library.

## Requests

### Create an empty WebSocket stream

```javascript
var ws = new WebSocket('wss://stream.zotero.org');
```

Server response:

```
{"event": "connected", "retry": 10000}
```

### Add subscriptions to the event stream

Client message:

```javascript
{
    "action": "createSubscriptions",
    "subscriptions": [
        {
            "apiKey": "abcdefghijklmn1234567890",
            "topics": [
                "/users/123456",
                "/groups/234567",
                "/groups/345678"
            ]
        },
        {
            "apiKey": "bcdefghijklmn12345678901"
        },
        {
            "topics": [
                "/groups/456789",
                "/groups/567890"
            ]
        }
    ]
}
```

Server Response:

```javascript
{
    "event": "subscriptionsCreated",
    "subscriptions": [
        {
            "apiKey": "abcdefghijklmn1234567890",
            "topics": [
                "/users/123456",
                "/groups/234567"
            ]
        },
        {
            "apiKey": "bcdefghijklmn2345678901",
            "topics": [
                "/users/345678"
            ]
        },
        {
            "topics": [
                "/groups/456789"
            ]
        }
    ],
    "errors": [
        {
            "apiKey": "abcdefghijklmn1234567890",
            "topic": "/groups/345678",
            "error": "Topic is not valid for provided API key"
        },
        {
            "topic": "/groups/567890",
            "error": "Topic is not accessible without an API key"
        }
    ]
}
```

All topic subscriptions — new and existing — for the specified API keys are included in the response. Subscriptions for previously added API keys not in the current request are not included. Subscriptions for public topics can be made without specifying an API key, and the newly added topics will be grouped together in the response.

If a `topics` property is not provided for an API key, the connection will receive events for all topics available to that key and will [automatically track](https://www.zotero.org/support/dev/web_api/v3/#key_access_tracking "dev:web_api:v3:streaming_api ↵") changes to the key's available topics.

Topic subscriptions cannot be removed via `createSubscriptions`. If subscriptions for a given API key already exist, the provided topics will be merged with the existing ones. If an empty `topics` array is provided, no changes will be made. If no `topics` property is provided, the key will be upgraded to automatically track access as described above.

#### Errors

| 4403 Forbidden | Invalid API key |
| --- | --- |
| 4413 Request Entity Too Large | Number of subscriptions (including existing subscriptions) would exceed the per-connection limit |

### Receive events on the existing event stream

```javascript
{"event": "topicUpdated", "topic": "/users/123456", "version": 678}
 
{"event": "topicAdded", "apiKey": "abcdefghijklmn1234567890", "topic": "/groups/345678"}
 
{"event": "topicRemoved", "apiKey": "abcdefghijklmn1234567890", "topic": "/groups/234567"}
```

### Delete all subscriptions for a given API key

Client message:

```javascript
{
    "action": "deleteSubscriptions",
    "subscriptions": [
        {
            "apiKey": "abcdefghijklmn1234567890"
        }
    ]
}
```

Server response:

```
{
    "event": "subscriptionsDeleted"
}
```

#### Errors

| 4409 Conflict | Subscription with a given API key or topic doesn't exist on this connection |
| --- | --- |

### Delete specific API key/topic pair

Client message:

```javascript
{
    "action": "deleteSubscriptions",
    "subscriptions": [
        {
            "apiKey": "abcdefghijklmn1234567890",
            "topic": "/users/123456"
        }
    ]
}
```

Server response:

```
{
    "event": "subscriptionsDeleted"
}
```

If a topic is manually removed from a key that is automatically tracking topics, the resulting list of topics will be fixed and the key will no longer receive `topicAdded` events. It may still receive `topicRemoved` events if the key loses access to topics.

#### Errors

| 4409 Conflict | Subscription with the given API key and/or topic doesn't exist on this connection |
| --- | --- |

### Delete a public topic subscription

Client message:

```javascript
{
    "action": "deleteSubscriptions",
    "subscriptions": [
        {
            "topic": "/users/123456"
        }
    ]
}
```

Server response:

```javascript
{
    "event": "subscriptionsDeleted"
}
```

#### Errors

| 4409 Conflict | Public subscription for the given topic doesn't exist on this connection |
| --- | --- |

## Key Access Tracking

For API keys without specified topics, the connection will track the key's access and receive events for all topics available to the key.

For example, if the owner of the key joins a group and the key has access to all of the user's groups, the connection will receive a `topicAdded` event and begin receiving `topicUpdated` events as data in the group changes.