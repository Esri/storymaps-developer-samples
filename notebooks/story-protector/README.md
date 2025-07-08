# Story Delete Protector Notebook

This folder contains a Python Notebook that uses the ArcGIS API for Python to detect content used within a story and apply [delete protection](https://doc.arcgis.com/en/arcgis-online/manage-data/configure-item-details.htm#ESRI_SECTION2_1BA06BA3035C4A7C82729B3DB60F1433) to those items and the story itself, preventing accidental deletion.

This is useful as a final step during publishing to ensure that all content featured within the story is protected from accidental deletion and [shared at the same level](https://doc.arcgis.com/en/arcgis-online/share-maps/share-items.htm).

## Features

- Can be run in ArcGIS Notebooks environment
- Scans the contents of a given story and detects ArcGIS content items within
- Bulk applies delete protection to the found items
- Applies delete protection to the story
- Optionally, updates the sharing-level of the items and the story (provided user is the owner)

## Instructions

This notebook can be accessed and run in the [ArcGIS Notebooks environment here](https://story.maps.arcgis.com/home/item.html?id=6c5c8553339c48b181cadbfe5edf5c64). These instructions will describe the steps required to run the notebook in ArcGIS Notebooks. To run locally the notebook can be downloaded and run in your own environment.

To get started, you'll need to update a few parameters.

1. **Open the Story Protector notebook:** [Follow this link](https://story.maps.arcgis.com/home/item.html?id=6c5c8553339c48b181cadbfe5edf5c64) to open the item page for the Story Protector notebook. Click **'Open notebook'**.

2. **Update notebook parameters:**
- **`story_id`**: Provide the `itemId` of the selected story. This can be obtained from the url `https://storymaps.arcgis.com/stories/<itemId>`

- **`delete_protect`**: Configure whether to enable delete protection on the items, `True`, or to disable delete protection on the items, `False`.

- **`share`**: Configure whether to share the items, `True`, or to disable sharing of the items, `False`.

- **`share_level`**: When sharing the items, configure at which level to share: `public`, `org`, or `private`.

> [!NOTE]
Setting delete protection and sharing level requires the user running the script to own the items or have admin privileges.

3. **Run cells in the notebook:** Sequentially run each cell of the notebook individually **up to the 'Review the results' cell. Pausing before running this cell will allow the changes made by the script to take effect before verifying that the results.

4. **Review the results:** Run the final cell of the notebook to re-query the items and verify their sharing and delete protection status.

## Requirements
- Setting delete protection and sharing level requires the user running the script to own the items or have admin privileges.

## Resources

- [ArcGIS API for Python](https://developers.arcgis.com/python/latest/)
- [Sharing levels](https://doc.arcgis.com/en/arcgis-online/share-maps/share-items.htm)
- [Delete protection](https://doc.arcgis.com/en/arcgis-online/manage-data/configure-item-details.htm#ESRI_SECTION2_1BA06BA3035C4A7C82729B3DB60F1433)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).

## Licensing

Copyright 2024 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](/LICENSE) file.
