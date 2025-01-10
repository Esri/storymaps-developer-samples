"""
ArcGIS Item Relationship Analysis Graphing Tool

This script connects to an ArcGIS portal to analyze, classify, and map relationships
between various ArcGIS items within an organization. It retrieves, processes, and saves
information about related items to CSV files, and can also generate an HTML file for
visualizing item relationships using a network graph.

Dependencies:
    - arcgis: ArcGIS API for Python
    - pandas: Data manipulation and storage
    - re: Regular expressions for item ID extraction
    - warnings: To suppress irrelevant warnings
    - uuid: To generate unique identifiers for rows
    - networkx, pyvis: For graph construction and visualization
    - matplotlib: For graphing (if HTML graph is enabled)

Configuration Parameters:
    - PORTAL (str): The ArcGIS portal URL.
    - USERNAME, PASSWORD (str): Credentials for portal login.
    - OUTPUT_FILE (str): File path to save results on related items.
    - OUTPUT_MISS_FILE (str): File path to save items that could not be processed.
    - GRAPH_FILE (str): File path to save the graph as an HTML file.
    - CREATE_GRAPH_HTML (bool): Option to generate an HTML graph.
    - QUERY_START_DATE (int): Timestamp in milliseconds to set a starting date for queries.
    - ACCOUNT (str): Account to analyze (defaults to logged-in user if empty).
    - TEST_MAX_PROCESSED_ITEMS, TEST_MAX_FOUND_ITEMS (int): Limits for testing; set to None for production.

Main Functions:
    - classify_by_type_typekeywords: Classifies an ArcGIS item based on type and type keywords.
    - get_all_content_items_in_org: Retrieves all items within an organization.
    - get_related_items_for_id: Recursively finds related items for a given item ID.
    - process_paused_related_items: Manages items marked as "paused" to avoid cyclic dependencies.
    - insert_slice_below: Helper function to insert DataFrame slices.
    - replace_path: Modifies paths for tracking item relationships.
    - find_all_possible_ids: Extracts potential ArcGIS item IDs from JSON strings.

Usage:
    - Ensure the ArcGIS API for Python is installed and valid credentials are available.
    - Set configuration parameters at the top of the script as needed.
    - Run the script to produce CSV files of related items and (optionally) an HTML graph.
    - Review the output CSVs to examine processed and missed items.

Example:
    $ python arcgis_item_analysis.py
"""


import re
import time
import uuid
import warnings
from typing import List, Set, Union

import pandas as pd
from arcgis.gis import GIS, Item

warnings.filterwarnings("ignore")

# Portal to investigate
PORTAL = "https://www.arcgis.com"
# Username to log in to the portal
USERNAME = ""
# Password associated with the portal
PASSWORD = ""
# Output CSV file location
OUTPUT_FILE = "related_items.csv"
# Location for CSV where missed items and error messages will be added
OUTPUT_MISS_FILE = "missed_items.csv"
# Location of graphing html file. Will only output when CREATE_GRAPH_HTML is True
GRAPH_FILE = "graph.html"
# Should data be graphed at the end of the process
CREATE_GRAPH_HTML = True
# Unix timestamp (in milliseconds) marking the starting point for the search algorithm. Default is 00:00:00, January 1st, 2016
QUERY_START_DATE = 1451624400000
# The name of the account to be analyzed. If left blank the script will use the logged in user.
ACCOUNT = None
# Max number of items to analyze. FOR dev/testing purposes. Modify this value to an integer if you want to test this script with a shortened run
TEST_MAX_PROCESSED_ITEMS = None
# Max number of items to find.. FOR dev/testing purposes.  Modify this value to an integer if you want to test this script with a shortened run
TEST_MAX_FOUND_ITEMS = None

COLOR_MAP = {
    # Maps - Blue
    "360 VR Experience": "#00BFFF",  # DeepSkyBlue
    "CityEngine Web Scene": "#00BFFF",  # DeepSkyBlue
    "Map Area": "#00BFFF",  # DeepSkyBlue
    "Pro Map": "#00BFFF",  # DeepSkyBlue
    "Web Map": "#00BFFF",  # DeepSkyBlue
    "Web Scene": "#00BFFF",  # DeepSkyBlue
    # Layers - Yellow
    "Feature Collection": "#FFD700",  # Gold
    "Feature Collection Template": "#FFD700",  # Gold
    "Feature Service": "#FFD700",  # Gold
    "Geodata Service": "#FFD700",  # Gold
    "Group Layer": "#FFD700",  # Gold
    "Media Layer": "#FFD700",  # Gold
    "Image Service": "#FFD700",  # Gold
    "KML": "#FFD700",  # Gold
    "KML Collection": "#FFD700",  # Gold
    "Map Service": "#FFD700",  # Gold
    "OGCFeatureServer": "#FFD700",  # Gold
    "Oriented Imagery Catalog": "#FFD700",  # Gold
    "Relational Database Connection": "#FFD700",  # Gold
    "3DTilesService": "#FFD700",  # Gold
    "Scene Service": "#FFD700",  # Gold
    "Vector Tile Service": "#FFD700",  # Gold
    "WFS": "#FFD700",  # Gold
    "WMS": "#FFD700",  # Gold
    "WMTS": "#FFD700",  # Gold
    # Service Palette
    "Geometry Service": "#778899",  # LightSlateGray
    "Geocoding Service": "#778899",  # LightSlateGray
    "Geoprocessing Service": "#778899",  # LightSlateGray
    "Network Analysis Service": "#778899",  # LightSlateGray
    "Workflow Manager Service": "#778899",  # LightSlateGray
    # StoryMaps
    "Collection": "#008080",  # Teal
    "Briefing": "#008B8B",  # DarkCyan
    "StoryMap": "#008B8B",  # DarkCyan
    "Frame": "#20B2AA",  # LightSeaGreen
    "Theme": "#20B2AA",  # LightSeaGreen
    "StoryMap Template": "#20B2AA",  # LightSeaGreen
    "StoryMap Theme": "#20B2AA",  # LightSeaGreen
    # Dashboard - Orange
    "Dashboard": "#FFA500",  # Orange
    # Experience Builder
    "Experience Builder Widget": "#66CDAA",  # Aquamarine
    "Experience Builder Widget Package": "#66CDAA",  # Aquamarine
    # Web Experience
    "Web Experience": "#AFEEEE",  # PaleTurquoise
    "Web Experience Template": "#AFEEEE",  # PaleTurquoise
    # Web Map Apps
    "Web Mapping Application": "#008000",  # DarkGreen
    # Hub - DarkOrchid
    "Hub Event": "#9932CC",  # DarkOrchid
    "Hub Initiative": "#9932CC",  # DarkOrchid
    "Hub Initiative Template": "#9932CC",  # DarkOrchid
    "Hub Page": "#9932CC",  # DarkOrchid
    "Hub Project": "#9932CC",  # DarkOrchid
    "Hub Site Application": "#9932CC",  # DarkOrchid
    # Survey123
    "Form": "#9ACD32",  # YellowGreen
    # Insights - OrangeRed
    "Insights Workbook": "#FF4500",  # OrangeRed
    "Insights Workbook Package": "#FF4500",  # OrangeRed
    "Insights Model": "#FF4500",  # OrangeRed
    "Insights Page": "#FF4500",  # OrangeRed
    "Insights Theme": "#FF4500",  # OrangeRed
    "Insights Data Engineering Workbook": "#FF4500",  # OrangeRed
    "Insights Data Engineering Model": "#FF4500",  # OrangeRed
    ## NO PREFERENCE for these...
    "GeoBIM Application": "#90EE90",  # CornflowerBlue
    "GeoBIM Project": "#8FBC8F",  # CornflowerBlue
    "Data Pipeline": "#32CD32",  # Lime Green
    "Deep Learning Studio Project": "#00FF7F",  # Spring Green
    "Esri Classification Schema": "#00FA9A",  # Medium Spring Green
    "Excalibur Imagery Project": "#8FBC8F",  # Dark Sea Green
    "AppBuilder Extension": "#006400",  # Dark Green
    "AppBuilder Widget Package": "#228B22",  # Forest Green
    "Code Attachment": "#2E8B57",  # Sea Green
    "Investigation": "#7FFF00",  # Chartreuse
    "Knowledge Studio Project": "#90EE90",  # Light Green
    "Mission": "#98FB98",  # Pale Green
    "Mobile Application": "#ADFF2F",  # Green Yellow
    "Notebook": "#00FF00",  # Pure Green
    "Notebook Code Snippet Library": "#7CFC00",  # Lawn Green
    "Native Application": "#9ACD32",  # Yellow Green
    "Native Application Installer": "#32CD32",  # Lime Green
    "Ortho Mapping Project": "#20B2AA",  # Light Sea Green
    "Ortho Mapping Template": "#66CDAA",  # Aquamarine
    "Solution": "#3CB371",  # Medium Sea Green
    "Web AppBuilder Widget": "#7FFF00",  # Chartreuse
    "Workforce Project": "#90EE90",  # Light Green
    # Data Palette
    "Administrative Report": "#FFE4B5",  # Moccasin
    "Apache Parquet": "#FFE4B5",  # Moccasin
    "CAD Drawing": "#FFE4B5",  # Moccasin
    "Color Set": "#FFE4B5",  # Moccasin
    "Content Category Set": "#FFE4B5",  # Moccasin
    "CSV": "#FFE4B5",  # Moccasin
    "CSV Collection": "#FFE4B5",  # Moccasin
    "Document Link": "#FFE4B5",  # Moccasin
    "Earth configuration": "#FFE4B5",  # Moccasin
    "Esri Classifier Definition": "#FFE4B5",  # Moccasin
    "Export Package": "#FFE4B5",  # Moccasin
    "File Geodatabase": "#CFFE4B5",  # Moccasin
    "GeoJson": "#FFE4B5",  # Moccasin
    "GeoPackage": "#FFE4B5",  # Moccasin
    "GML": "#FFE4B5",  # Moccasin
    "Image": "#FFE4B5",  # Moccasin
    "iWork Keynote": "#FFE4B5",  # Moccasin
    "iWork Numbers": "#FFE4B5",  # Moccasin
    "iWork Pages": "#FFE4B5",  # Moccasin
    "Microsoft Excel": "#4FFE4B5",  # Moccasin
    "Microsoft Powerpoint": "#FFE4B5",  # Moccasin
    "Microsoft Word": "#FFE4B5",  # Moccasin
    "PDF": "#FFE4B5",  # Moccasin
    "Report Template": "#FFE4B5",  # Moccasin
    "Service Definition": "#FFE4B5",  # Moccasin
    "Shapefile": "#FFE4B5",  # Moccasin
    "SQLite Geodatabase": "#FFE4B5",  # Moccasin
    "Statistical Data Collection": "#FFE4B5",  # Moccasin
    "Style": "#FFE4B5",  # Moccasin
    "Symbol Set": "#FFE4B5",  # Moccasin
    "Visio Document": "#FFE4B5",  # Moccasin
    # Other Palette
    "other": "#C0C0C0",  # Silver
}


def classify_by_type_typekeywords(item: Item) -> str:
    """
    Classifies an ArcGIS item based on its type keywords.

    Args:
        item (Item): The ArcGIS item to classify.

    Returns:
        str: The classification of the item.
    """
    typekeywords = item.typeKeywords
    isTemplate = "storymaptemplate" in typekeywords
    if "storymapbriefing" in typekeywords and "StoryMap" in typekeywords:
        return "Briefing"
    if "storymapcollection" in typekeywords and "StoryMap" in typekeywords:
        return "Collection"
    if "storymapframe" in typekeywords and "StoryMap" in typekeywords:
        return "Frame"
    if "StoryMap Theme" in typekeywords:
        return "Theme"
    if "StoryMap" in typekeywords:
        return "StoryMap Template" if isTemplate else "StoryMap"
    # Not a storymap return the type if it is in color map else return other
    if item.type in COLOR_MAP:
        return item.type
    else:
        return "other"


def get_all_content_items_in_org(gis_con: GIS, owner: str = None) -> Set[str]:
    """
    Retrieves all StoryMap items within the organization.

    Args:
        gis_con (GIS): The GIS connection object.
        owner (str, optional): The owner to filter items, if not passed will default to logged in user.

    Returns:
        Set[str]: A set of item IDs found.
    """
    org_users = gis_con.users.search(query=f"username:{owner}")
    run_date = int(time.time() * 1000)
    if owner is None:
        owner = gis_con.users.me.username
    found_ids = set()
    total_items_found = 0
    for index_user, user in enumerate(org_users):
        # TODO Owner should never be none at this point, can rework this section
        if owner is not None and len(owner) > 0 and user.username != owner:
            continue
        loop_counter = 0
        current_results = []
        modified_date_modifier = None
        len_result = 1000
        start = 0
        while len_result == 1000:
            if (
                TEST_MAX_FOUND_ITEMS is not None
                and total_items_found > TEST_MAX_FOUND_ITEMS
            ):
                break
            loop_counter += 1
            if start >= 10000:
                # add a 1ms reduction to the last modified date of the current results
                last_created = current_results[-1].created
                modified_date_modifier = (
                    last_created + 1
                )  # Adjust the modified date range
                start = 0
            query = f"owner: {user.username}"
            if modified_date_modifier:
                query += f" AND created:[{modified_date_modifier} TO {run_date}]"
            else:
                query += f" AND created:[{QUERY_START_DATE} TO {run_date}]"
            print(f"Query: {query}")
            result = gis_con.content.advanced_search(
                query=query,
                max_items=1000,
                start=start,
                sort_field="created",
                sort_order="asc",
            )
            len_result = len(result["results"])
            start += len_result
            total_items_found += len_result
            current_results = result["results"]
            for item in result["results"]:
                found_ids.add(item.id)
            if len_result < 1000:
                break
            # print progress
            print(f"Total items found: {len(found_ids)} in {loop_counter} loops")
        # if index_user <= 1:
        #     return found_ids
    return found_ids


def get_item_data(item: Item):
    """
    Fetches data for a given ArcGIS item, handling different resource types.

    Args:
        item (Item): The ArcGIS item to fetch data for.

    Returns:
        tuple: A tuple containing the item data and any related data.
    """
    item_data = item.get_data(try_json=True)
    if item.type in ["StoryMap", "StoryMap Theme"]:
        # Should only be relevant to StoryMaps
        try:
            resources = [resource["resource"] for resource in item.resources.list()]
            has_published_data = "published_data.json" in resources
            draft_id = None
            for keyword in item.typeKeywords:
                if keyword.startswith("smdraftresourceid"):
                    draft_id = keyword.split(":")[1]
            if has_published_data and not draft_id:
                return (item.resources.get("published_data.json", try_json=True), None)
            elif draft_id and not has_published_data:
                return (item.resources.get(f"{draft_id}", try_json=True), None)
            elif draft_id and has_published_data:
                return (
                    item.resources.get(f"{draft_id}", try_json=True),
                    item.resources.get("published_data.json", try_json=True),
                )
            else:
                return (item.resources.get("draft.json", try_json=True), None)
        except Exception as e:
            return (None, None)
    return (item_data, None)


def find_all_possible_ids(json_string: str):
    """
    Extracts all possible item IDs from a JSON string using regex.

    Args:
        json_string (str): The JSON string to search for IDs.

    Returns:
        list: A list of found item IDs.
    """
    return re.findall(r"[\"\'\/]([a-zA-Z0-9]{32})[\"\'\/]", json_string)


def get_related_items_for_id(
    gis_con: GIS,
    item_id: str,
    related_items_df: pd.DataFrame,
    missed_items_df: pd.DataFrame,
    main_ancestors: Set[str],
    base_ancestor: Union[Item | None] = None,
    relation_path: List[str] = [],
    relations_in_process: List[str] = [],
):
    """
    Fetches related items for a given item ID and updates the related items DataFrame.
    This function attempts to fetch an item by its ID up to three times. If successful, it processes the item to find its related items and updates the provided DataFrames accordingly. It also handles cyclic dependencies and ensures that items are not processed multiple times.
    Args:
        gis_con (GIS): The GIS connection object.
        item_id (str): The ID of the item to fetch and process.
        related_items_df (pd.DataFrame): DataFrame to store information about related items.
        missed_items_df (pd.DataFrame): DataFrame to store information about items that could not be fetched.
        main_ancestors (Set[str]): Set to store the IDs of main ancestor items.
        base_ancestor (Union[Item, None], optional): The base ancestor item. Defaults to None.
        relation_path (List[str], optional): List to track the relation path of items. Defaults to an empty list.
        relations_in_process (List[str], optional): List to track items that are currently being processed. Defaults to an empty list.
    Returns:
        None
    """

    valid_item = None
    # Attempt to fetch the item up to 3 times
    for tries in range(3):
        try:
            valid_item = Item(gis_con, item_id)
            break  # Exit loop on successful fetch
        except Exception as e:
            # print(f"Error fetching item {item_id}: {e}. Retrying ({tries+1}/3)...")
            time.sleep(1)  # Adding delay before retry
            if tries == 2:
                missed_items_df.loc[uuid.uuid4()] = [item_id, None, None, str(e)]
    # Copy the current relation path for further processing
    new_relation_path = relation_path.copy()
    # Check if currently handling the main ancestor
    currently_handling_main_ancestor = base_ancestor is None
    # Detect cyclic dependency: if the item is already in the relation path
    if not currently_handling_main_ancestor and valid_item.itemid in relation_path:
        print(
            f"Detected a cyclic dependency! {valid_item.itemid} appears in the relation path {relation_path}."
        )
        return
    # If currently handling the main ancestor and valid_item is found, set it as the base ancestor
    if currently_handling_main_ancestor and valid_item:
        base_ancestor = valid_item
        main_ancestors.add(valid_item.itemid)
    # Only add the valid item's ID to the relation path if not handling the main ancestor
    if valid_item:
        new_relation_path.append(valid_item.itemid)
    # If not handling the main ancestor, proceed to process the valid item and add it to the related items DataFrame
    if not currently_handling_main_ancestor:
        # print("processing related item", valid_item.itemid)
        new_row = [
            base_ancestor.itemid,
            classify_by_type_typekeywords(base_ancestor),
            base_ancestor.title,
            base_ancestor.access,
            base_ancestor.owner,
            valid_item.itemid,
            classify_by_type_typekeywords(valid_item),
            valid_item.title,
            valid_item.access,
            valid_item.owner,
            valid_item.get("orgId", None),
            new_relation_path,
        ]
        # if exact row already exists, skip
        if related_items_df.apply(lambda row: row.tolist() == new_row, axis=1).any():
            # print("oops!")
            return
        ## Check if the related item is already being processed:
        if valid_item.itemid in relations_in_process:
            new_row.append("Yes")
            related_items_df.loc[uuid.uuid4()] = new_row
            print(f"Item {valid_item.itemid} is already in process")
            return
        new_row.append("No")
        ## Add valid item to the ancestors
        related_items_df.loc[uuid.uuid4()] = new_row
    # If valid_item was successfully fetched, and all previous conditions are met, proceed to fetch related items for this item
    if valid_item:
        items_related_to_valid_item = set()
        relations_in_process.append(valid_item.itemid)
        valid_item_data = get_item_data(valid_item)
        # If the first part of the fetched data is not empty
        if valid_item_data[0] is not None or valid_item_data[0] != {}:
            related_json_string = str(valid_item_data[0])
            related_ids = find_all_possible_ids(related_json_string)
            [items_related_to_valid_item.add(related_id) for related_id in related_ids]
        # If the second part of the fetched data is not empty (only relevant to StoryMaps), and considers draft related items
        if valid_item_data[1] is not None or valid_item_data[1] != {}:
            related_json_string = str(valid_item_data[1])
            related_ids = find_all_possible_ids(related_json_string)
            [items_related_to_valid_item.add(related_id) for related_id in related_ids]
        # Iterate over each related ID found
        for related_id in items_related_to_valid_item:
            # Recursively call the function to find related items for each related ID
            get_related_items_for_id(
                gis_con,
                related_id,
                related_items_df,
                missed_items_df,
                main_ancestors,
                base_ancestor,
                new_relation_path,
            )


def insert_slice_below(df, index, new_slice: pd.DataFrame):
    """
    Inserts a slice of a DataFrame below a specified index.

    Args:
        df (pd.DataFrame): The DataFrame to insert the slice into.
        index (int): The index to insert the slice below.
        new_slice (pd.DataFrame): The slice to insert.
    """
    # split original dataframe into two parts
    top = df.iloc[: index + 1]
    ## only slice bottom if index is not the last row
    if index == len(df) - 1:
        print("index is last row")
        bottom = df.iloc[index + 1 :]
        return pd.concat([top, new_slice])
    bottom = df.iloc[index + 1 :]
    # concatenate the two parts with the new slice in between
    return pd.concat([top, new_slice, bottom])


def replace_path(processed_path: list, original_path: list, paused_item_id: str):
    """
    Takes the original path and appends the processed path from the paused item.

    Args:
        processed_path (list): The processed path from the paused item.
        original_path (list): The original path.
        paused_item_id (str): The ID of the paused item.
    """
    # takes the origianl path and appends the processed path from the paused item
    # find the index of the paused item in the original path
    paused_item_index = processed_path.index(paused_item_id)
    # append the processed path from the paused item
    if paused_item_index == len(processed_path) - 1:
        return original_path
    return original_path + processed_path[paused_item_index + 1 :]


def process_paused_related_items(related_df: pd.DataFrame):
    """
    Processes paused related items in the given DataFrame.
    This function identifies rows in the DataFrame where the 'Awaiting Processing' column is marked as "Yes".
    For each paused item, it finds the corresponding processed item where the 'Related Item Id' matches and
    'Awaiting Processing' is marked as "No". It then counts the number of related rows following the processed item
    that include the paused item's ID in their 'Relationship Path'. An empty DataFrame of the same size is created and
    inserted below the paused item. A slice of the DataFrame from the processed item index to the related row count is
    created, modified, and inserted below the paused item. Finally, duplicates are removed from the DataFrame.
    Args:
        related_df (pd.DataFrame): The DataFrame containing related items with columns including 'Awaiting Processing',
                                    'Relationship Path', 'Related Item Id', 'Organization Item', 'Org item type',
                                    'Org item Title', 'Org Item Sharing', and 'Org item owner'.
    Returns:
        None: The DataFrame is modified in place.
    """
    paused_items = related_df[related_df["Awaiting Processing"] == "Yes"]
    paused_items_indexes = paused_items.index.tolist()
    for index in paused_items_indexes:
        # get the paused item
        paused_item = related_df.loc[index]
        # get integer index of the paused item
        paused_item_index = related_df.index.get_loc(index)
        # get the path of the paused item
        paused_item_path = paused_item["Relationship Path"]
        # get the paused item id
        paused_item_id = paused_item["Related Item Id"]
        # get processed item where related item id is the paused item id and Await Processing is No
        processed_item = related_df[
            (related_df["Related Item Id"] == paused_item_id)
            & (related_df["Awaiting Processing"] == "No")
        ]
        if processed_item.empty:
            print("No processed item found")
            continue
        # get the index of the processed item
        print("processed item:", processed_item)
        processed_item_index = processed_item.index[0]
        print("processed item index:", processed_item_index)
        processed_item_int_index = related_df.index.get_loc(processed_item_index)
        print("processed item int index:", processed_item_int_index)
        related_row_count = 0
        counting_related_rows = True
        # count number of items following the processed item that include the paused item id
        while counting_related_rows:
            if (
                paused_item_id
                in related_df.iloc[processed_item_int_index + related_row_count + 1][
                    "Relationship Path"
                ]
            ):
                related_row_count += 1
            else:
                counting_related_rows = False
        # If Related row count is 0 that means the investigated item has no dependencies, and we can move on to the next item
        if related_row_count < 1:
            continue
        # Add empty dataframe of size related_row_count to the related items dataframe at the location of the paused item
        empty_df = pd.DataFrame(columns=related_df.columns)
        for i in range(related_row_count):
            empty_df.loc[uuid.uuid4()] = [None for i in range(len(related_df.columns))]
        # Create slice df of the related items dataframe from the processed item index + 1 to related_row_count
        slice_df = related_df.iloc[
            processed_item_int_index
            + 1 : processed_item_int_index
            + related_row_count
            + 1
        ]
        slice_df.index = [uuid.uuid4() for i in range(len(slice_df))]
        slice_df["Awaiting Processing"] = slice_df["Awaiting Processing"].apply(
            lambda x: "NA"
        )
        slice_df["Organization Item"] = slice_df["Organization Item"].apply(
            lambda x: paused_item["Organization Item"]
        )
        slice_df["Org item type"] = slice_df["Org item type"].apply(
            lambda x: paused_item["Org item type"]
        )
        slice_df["Org item Title"] = slice_df["Org item Title"].apply(
            lambda x: paused_item["Org item Title"]
        )
        slice_df["Org Item Sharing"] = slice_df["Org Item Sharing"].apply(
            lambda x: paused_item["Org Item Sharing"]
        )
        slice_df["Org item owner"] = slice_df["Org item owner"].apply(
            lambda x: paused_item["Org item owner"]
        )
        # replace the path in the slice using the processed item path
        slice_df["Relationship Path"] = slice_df["Relationship Path"].apply(
            lambda x: replace_path(x, paused_item_path, paused_item_id)
        )
        related_df = insert_slice_below(related_df, paused_item_index, slice_df)
        # drop duplicates from the related items dataframe, do not include index
        related_df = related_df.loc[related_df.astype(str).drop_duplicates().index]


if __name__ == "__main__":
    gis_con = GIS(PORTAL, USERNAME, PASSWORD)
    all_storymap_items = get_all_content_items_in_org(gis_con, ACCOUNT)
    print(len(all_storymap_items))
    missed_items = pd.DataFrame(
        columns=["itemId", "item_title", "item_owner", "error_message"]
    )
    related_items = pd.DataFrame(
        columns=[
            "Organization Item",
            "Org item type",
            "Org item Title",
            "Org Item Sharing",
            "Org item owner",
            "Related Item Id",
            "Related Item Type",
            "Related Item Title",
            "Related Item Sharing",
            "Related Item Owner",
            "Related Item Org",
            "Relationship Path",
            "Awaiting Processing",
        ]
    )
    for index, item_id in enumerate(all_storymap_items):
        print(f"Processing item {index} with id {item_id}")
        try:
            get_related_items_for_id(
                gis_con, item_id, related_items, missed_items, all_storymap_items
            )
        except Exception as e:
            missed_items.loc[uuid.uuid4()] = [item_id, None, None, str(e)]
        if TEST_MAX_PROCESSED_ITEMS is not None and index > TEST_MAX_PROCESSED_ITEMS:
            break
    print(len(related_items))
    related_items.to_csv(OUTPUT_FILE)
    # only have unique rows in the missed items
    missed_items = missed_items.drop_duplicates()
    missed_items.to_csv(OUTPUT_MISS_FILE)

    # find paused related items and their indexes
    process_paused_related_items(related_items)
    related_items.to_csv(OUTPUT_FILE)

    # Optional graphing
    if CREATE_GRAPH_HTML and GRAPH_FILE is not None:
        import networkx as nx
        from pyvis.network import Network

        data_for_graph = related_items["Relationship Path"].tolist()
        list_of_unique_items_and_types = (
            related_items["Related Item Type"].tolist()
            + related_items["Org item type"].tolist()
        )
        number_of_unique_item_types = len(set(list_of_unique_items_and_types))
        sorted_unique_item_types = sorted(set(list_of_unique_items_and_types))
        G = nx.Graph()
        for path in data_for_graph:
            for index, item in enumerate(path):
                item_ago = Item(gis_con, item)
                item_type = classify_by_type_typekeywords(item_ago)
                G.add_node(
                    item,
                    title=f"<p>Open <a href='{PORTAL}/home/item.html?id={item}'>{item_type}</a></p>",
                    label=f"{item_type}: {item_ago.title}",
                    color=COLOR_MAP[item_type],
                )
            nx.add_path(G, path)
        # if not running this script in a Notebook, make `notebook=False`
        net = Network(notebook=True, select_menu=True, filter_menu=True)
        net.from_nx(G)
        for node in net.nodes:
            node["color"] = COLOR_MAP[
                classify_by_type_typekeywords(Item(gis_con, node["id"]))
            ]
        for edge in net.edges:
            edge["color"] = "#0A0A0A"
        net.show(GRAPH_FILE)
