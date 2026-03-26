/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("items_collection")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "fj2x0aze7c",
    "max": null,
    "min": null,
    "name": "qty",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "frn2slyuei",
    "max": null,
    "min": null,
    "name": "unitPrice",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("items_collection")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "fj2x0aze7c",
    "max": null,
    "min": null,
    "name": "qty",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "frn2slyuei",
    "max": null,
    "min": null,
    "name": "unitPrice",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
