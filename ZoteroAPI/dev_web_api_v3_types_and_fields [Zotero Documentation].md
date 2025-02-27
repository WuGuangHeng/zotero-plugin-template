---
title: "dev:web_api:v3:types_and_fields [Zotero Documentation]"
source: "https://www.zotero.org/support/dev/web_api/v3/types_and_fields"
author:
published:
created: 2025-02-27
description: "Zotero is a free, easy-to-use tool to help you collect, organize, cite, and share research."
tags:
  - "clippings"
---
## Zotero Web API Item Type/Field Requests

For a [Zotero Web API](https://www.zotero.org/support/dev/web_api/v3/start "dev:web_api:v3:start") client to present an editing UI to its users, it must know what combinations of Zotero item types, fields, and creator types are valid. Clients can request this data from the Zotero API.

As schema changes are currently rare, clients should cache type/field data for a period of time (e.g., one hour) without making further requests. Subsequent requests for new data should then include `If-Modified-Since` headers containing the contents of the `Last-Modified` header from the original response. If no changes have occurred, the server will return a `304 Not Modified` and clients should continue to use cached data for the same period of time. *\[Conditional requests – i.e. `If-Modified-Since` – are not yet implemented.\]*

User-friendly type/field names will be returned in English by default. Clients can request names in other languages by passing a `locale` parameter (e.g., `GET /itemTypes?locale=fr-FR`).

Note: the entire schema, including translations for all locales, can also be downloaded as a single file at [https://api.zotero.org/schema](https://api.zotero.org/schema "https://api.zotero.org/schema"). See the [GitHub repository of the schema](https://github.com/zotero/zotero-schema "https://github.com/zotero/zotero-schema") for caching instructions.

### Getting All Item Types

```
GET /itemTypes
If-Modified-Since: Mon, 14 Mar 2011 22:30:17 GMT
```
```javascript
[
  { "itemType" : "book", "localized" : "Book" },
  { "itemType" : "note", "localized" : "Note" },
  (…)
]
```

<table><thead><tr><th colspan="2">Common responses</th></tr></thead><tbody><tr><td><code>200 OK</code></td><td></td></tr><tr><td><code>304 Not Modified</code></td><td>No changes have occurred since <code>If-Modified-Since</code> time.</td></tr><tr><td><code>400 Bad Request</code></td><td>Locale not supported.</td></tr></tbody></table>

### Getting All Item Fields

```
GET /itemFields
If-Modified-Since: Mon, 14 Mar 2011 22:30:17 GMT
```
```javascript
[
  { "field" : "title", "localized" : "Title" },
  { "field" : "url", "localized" : "URL" },
  (…)
]
```

<table><thead><tr><th colspan="2">Common responses</th></tr></thead><tbody><tr><td><code>200 OK</code></td><td></td></tr><tr><td><code>304 Not Modified</code></td><td>No changes have occurred since <code>If-Modified-Since</code> time.</td></tr><tr><td><code>400 Bad Request</code></td><td>Locale not supported.</td></tr></tbody></table>

### Getting All Valid Fields for an Item Type

Note: API consumers intending to write to the server should generally use [/items/new](https://www.zotero.org/support/dev/web_api/v3/#getting_a_template_for_a_new_item "dev:web_api:v3:types_and_fields ↵") combined with [/itemTypes](https://www.zotero.org/support/dev/web_api/v3/#getting_all_item_types "dev:web_api:v3:types_and_fields ↵") instead of this request.

```
GET /itemTypeFields?itemType=book
If-Modified-Since: Mon, 14 Mar 2011 22:30:17 GMT
```
```javascript
[
  { "field" : "title", "localized" : "Title" },
  { "field" : "abstractNote", "localized" : "Abstract" },
  (…)
]
```

<table><thead><tr><th colspan="2">Common responses</th></tr></thead><tbody><tr><td><code>200 OK</code></td><td></td></tr><tr><td><code>304 Not Modified</code></td><td>No changes have occurred since <code>If-Modified-Since</code> time.</td></tr><tr><td><code>400 Bad Request</code></td><td>Locale not supported.</td></tr></tbody></table>

### Getting Valid Creator Types for an Item Type

```
GET /itemTypeCreatorTypes?itemType=book
```
```javascript
[
  { "creatorType" : "author", "localized" : "Author" },
  { "creatorType" : "editor", "localized" : "Editor" },
  (…)
]
```

<table><thead><tr><th colspan="2">Common responses</th></tr></thead><tbody><tr><td><code>200 OK</code></td><td></td></tr><tr><td><code>304 Not Modified</code></td><td>No changes have occurred since <code>If-Modified-Since</code> time.</td></tr><tr><td><code>400 Bad Request</code></td><td>'itemType' is unspecified or invalid; locale not supported.</td></tr></tbody></table>

### Getting Localized Creator Fields

```
GET /creatorFields
If-Modified-Since: Mon, 14 Mar 2011 22:30:17 GMT
```
```javascript
[
  { "field" : "firstName", "localized" : "First" },
  { "field" : "lastName", "localized" : "Last" },
  { "field" : "name", "localized" : "Name" }
]
```

<table><thead><tr><th colspan="2">Common responses</th></tr></thead><tbody><tr><td><code>304 Not Modified</code></td><td>No changes have occurred since <code>If-Modified-Since</code> time.</td></tr><tr><td><code>400 Bad Request</code></td><td>Locale not supported.</td></tr></tbody></table>

### Getting a Template for a New Item

```
GET /items/new?itemType=book
If-Modified-Since: Mon, 14 Mar 2011 22:30:17 GMT
```
```javascript
{
  "itemType" : "book",
  "title" : "",
  "creators" : [
    {
      "creatorType" : "author",
      "firstName" : "",
      "lastName" : ""
    }
  ],
  "url" : "",
  (...),
  "tags" : [],
  "collections" : [],
  "relations" : {}
}
```
```
GET /items/new?itemType=note
If-Modified-Since: Mon, 14 Mar 2011 22:30:17 GMT
```
```javascript
{
  "itemType" : "note",
  "note" : "",
  "tags" : [],
  "collections" : [],
  "relations" : {}
}
```

TODO: attachment creation (see [File Uploads](https://www.zotero.org/support/dev/web_api/v3/file_upload "dev:web_api:v3:file_upload"))

<table><thead><tr><th colspan="2">Common responses</th></tr></thead><tbody><tr><td><code>200 OK</code></td><td></td></tr><tr><td><code>304 Not Modified</code></td><td>No changes have occurred since <code>If-Modified-Since</code> time.</td></tr><tr><td><code>400 Bad Request</code></td><td><code>itemType</code> is unspecified or invalid.</td></tr></tbody></table>