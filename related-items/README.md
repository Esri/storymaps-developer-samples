# Find related ArcGIS Online content

This folder contains a Python script tool that uses the ArcGIS API for Python to inventory the content with your ArcGIS organization and detect relationships between these items and other content beyond. The script records these relationships and reports them as a `csv` file and can additionally visualize them in a network graph.

![This simplified example demonstrates how the connection between items can be visualized in a graph network.](/related-items/assets/Sample_Graph.jpg)*This simplified example demonstrates how the connection between items can be visualized in a graph network.*

## Features

- Inventories organization items
- Detects relationships in the form of embeds, and dependencies to other items within the organization and beyond
- Reports these connections in a `csv` file report
- Optionally, visualizes content inventory as a network graph

## Instructions

To get started and run this script to discover content in your organization, you need to follow a few steps.

1. **Download and setup the script:** Download the Python script from the link below. Due to the nature of the recursive search, it could time out when run from an ArcGIS Notebook. Therefore, it is recommended that the script be downloaded and run locally.

- Note: If running on a local machine without an ArcGIS Pro installation, install the ArcGIS API for Python by following [these installation steps](https://developers.arcgis.com/python/latest/guide/install-and-set-up/intro/).

2. **Update the script arguments:** The descriptions below provide a more in-depth breakdown of each argument.
- Note: As it may take some time to run, we recommend testing it on a small subset of your content. Either filter the `QUERY_START_DATE` to a date in the past 30 days or set the `TEST_MAX_PROCESSED_ITEMS` to a smaller value, such as `50`.

- `PORTAL`: This argument determines the organization that the tool will access when searching for content. Modify this argument to suit your organization.
```python
# When running in enterprise
PORTAL = `https://portal.domain.com`

# When running in ArcGIS Online
PORTAL = `https://arcgis.com`
```

- `USERNAME`/`PASSWORD`: The username and password used to log into the organization

- `OUTPUT_FILE`: The output `csv` file containing the item and related item inventory.

- `OUTPUT_MISS_FILE`: A separate inventory of items that could not be identified and a potential reason that they were missed.

- `CREATE_GRAPH_FILE`: Configure whether the tool will also create a graph file with the results (`TRUE` or `FALSE`)
- Note: If not running in a Notebook, change line `675` in the script to `notebook=False`.

- `GRAPH_FILE`: Define a name for the output graph file (`html`) that will be created alongside the CSV reports.

- `QUERY_START_DATE`: Define a start date for the script. Content created before this date will be excluded from the query. Configured as a Unix timestamp (in milliseconds) and the default is 00:00:00, January 1st, 2016

- `TEST_MAX_PROCESSED_ITEMS`: This argument defines the maximum number of items that will be processed in the script’s main loop.

- `TEST_MAX_FOUND_ITEMS`: This argument defines the maximum number of items fetched per query.

3. **Run the script**: Once you've reviewed the results from a test run, you can expand the scope of the tool to a greater time frame and maximum number of items and the script will query the content within your organization

4. **Explore the results**: The tool creates several outputs that can be further explored.

![This simplified example demonstrates how the connection between items can be visualized in a graph network.](/related-items/assets/Sample_CSV.jpg)*This pivot table demonstrates how the output 'related_items.csv' can be used to inventory items like stories and web maps, but also the content within those items or related to those items.*

- The script will create a `related_items.csv` listing each item in the query and various attributes, including item id, owner, title, sharing, type, and related items. This can be turned into a pivot table (see the example below) to help take stock of items and confirm their owner or sharing level.

- The script also creates a `missed_items.csv` report. This report contains the items that the tool could not process, along with a brief description of each item and the error encountered when it was processed.

- If the script's `CREATE_GRAPH_FILE` is enabled, the final output includes an `html` file that visualizes the item relationships in a network graph. The graph’s pop-ups can be used to quickly link to an item.

## Requirements

Here are some things you will need:
- If running on a machine that doesn't hav ArcGIS Pro installed, you'll need to install the ArcGIS API for Python by following [these installation steps](https://developers.arcgis.com/python/latest/guide/install-and-set-up/intro/).

## Resources

- [Esri Community post](https://community.esri.com/t5/arcgis-storymaps-blog/uncovering-related-content-in-your-stories-and/ba-p/1558871)
- [ArcGIS API for Python](https://developers.arcgis.com/python/latest/)

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
