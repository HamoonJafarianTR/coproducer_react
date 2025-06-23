from concurrent import futures
import concurrent
import re
import requests
from graphqlProd import graphql_query_production

# The URL of the GraphQL API
URL = 'https://qa.api.reutersconnect.com/content/graphql'


RENDITION_QUERY = """
        query Query {
          item(id: "%s") {
            associations {
              versionedGuid
              renditions {... on VideoRendition {code uri duration}
            }}}}"""

SEARCH_QUERY = """
        query VideoVectorQuery {
            search(
                query: "%s"
                filter: {mediaTypes: VIDEO}
                option:{aiProvider: INHOUSE}
                limit: 4,
            ) {
                totalHits items {headLine sortTimestamp keyword located versionedGuid uri properties {shotStart shotEnd}}
                }}"""

RENDITION_LINK_QUERY = """
        mutation MyMutation {
            download(itemId: "%s", renditionId: "%s") {
            ... on GenericItem {url}
        }}"""


def get_token():
    token_url = 'https://8y1mgdh096.execute-api.us-east-1.amazonaws.com/login-webservices/ciamUserToken?username=vector.pilot'
    response = requests.get(token_url)
    if response.status_code == 200:
        token = re.split('[><]', response.text)[-5]
        print(f'Got token: {token}')
        return token
    else:
        raise Exception("Failed to get api token")

# Additional headers like `Content-Type` and any other necessary information like authentication tokens
headers = {
    'Content-Type': 'application/json',
    # 'Authorization': f'MEX xE1mo0POx8AG2iSoqaaUfTo6hrH12v27ImvrSv5CoSE='
    'Authorization': f'MEX {get_token()}'
}

def graphql_query(query):
    # print(query)
    response = requests.post(URL, json={'query': query}, headers=headers)
    if response.status_code == 200:
        # print(response.json())
        return response.json()
    else:
        return "Query failed and return code is {}. {}".format(response.status_code, query)

def get_search_result(text) -> list[str]:
    """
    :param text: search keywords
    :return: item ids
    """
    query = SEARCH_QUERY % text
    return graphql_query(query)

def get_video_rendition(guid) -> dict[str, str]:
    """
    :param guid:
    :return: {guid: video rendition}
    """
    query = RENDITION_QUERY % guid
    resp = graphql_query(query)
    for assoc in resp['data']['item']['associations']:
        for rend in assoc['renditions']:
            if rend.get('code') == "stream:300:16x9:mp4":
                return rend['uri']
    raise Exception(f"No rendition found for {guid}")
    

def get_rendition_link(guid, rendition) -> dict[str, str]:
    """
    :param guid:
    :return: {guid: video_presigned_url}
    """
    query = RENDITION_LINK_QUERY % (guid, rendition)
    resp = graphql_query_production(query)
    if resp.get('errors'):
        return None
    url = {guid: resp['data']['download']['url']}
    return url

def get_video_url(guid) -> dict[str, str]:
    rendition = get_video_rendition(guid)
    link = get_rendition_link(guid, rendition)
    return link

def get_video_duration(guid) -> dict[str, str]:
    query = RENDITION_QUERY % guid
    resp = graphql_query_production(query)
    for assoc in resp['data']['item']['associations']:
        for rend in assoc['renditions']:
            if rend.get('code') == "stream:300:16x9:mp4":
                return rend['duration']
    raise Exception(f"No rendition found for {guid}")

def contentApiSearch(query):
    result = get_search_result(query)
    if result:
        print(f"Got search result: {len(result['data']['search']['items'])}")
    items = result['data']['search']['items']
    guids = [item['versionedGuid'] for item in items]
    uris = [item['uri'] for item in items]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        links = executor.map(get_video_url, uris)
    valid_links = [link for link in links if link]
    link_map = {k: v for d in valid_links for k, v in d.items()}
    results = []
    for item in items:
        try:
            results.append({
                'id': item['versionedGuid'],
                'video_url': link_map[item['uri']],
                'entity': {
                    'headline': item['headLine'],
                    'shotStart': item['properties']['shotStart'],
                    'shotEnd': item['properties']['shotEnd'],
                    'date': item['sortTimestamp'].split('T')[0],
                    'keyword': ", ".join(item['keyword']),
                    'located': item['located'],
                    'duration': get_video_duration(item['uri'])
                }
        })
        except:
            # print("GUID:", i['versionedGuid'])
            continue
    print(f"Got video links: {len(results)}")
    return results


if __name__ == "__main__":
    r = contentApiSearch("Mark Carney")
    print(len(r))
    # print(len(r[0]))
    print(r[2])