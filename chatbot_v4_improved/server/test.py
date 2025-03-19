import requests
import json


def get_token():
    url = "https://auth.thomsonreuters.com/oauth/token"
    payload = {
    "client_id": "DnVYrxBvRzYe94MONXewpSkPKYElohEm",  # Replace with your actual client ID
    "client_secret": "HqMKjjCi2elDzz-QIcbVMXc5evuWi26kEp6E_n4ySdujuS2bwVl2AkSjbh2pNJD_",  # Replace with your actual client secret
    "grant_type": "client_credentials",
    "audience": "7a14b6a2-73b8-4ab2-a610-80fb9f40f769",
    "scope": "https://api.thomsonreuters.com/auth/reutersconnect.contentapi.read https://api.thomsonreuters.com/auth/reutersconnect.contentapi.write"
    }
    headers = {
    "Content-Type": "application/json"
    }
    # Make the POST request
    response = requests.post(url, data=json.dumps(payload), headers=headers)
    # Check if the request was successful
    if response.status_code == 200:
        # Parse the JSON response
        token_data = response.json()
        access_token = token_data.get("access_token")
        print(f"Got Production Access Token")
        return access_token
    else:
        print(f"Error: {response.status_code}")
        print(f"Response: {response.text}")

def query_reuters_connect(query, access_token):

    url = "https://api.reutersconnect.com/content/graphql"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    # Request payload
    payload = {
        "query": query,
        "variables": {}
    }

    # Make the POST request
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    return (response.json())

def graphql_query_production(query):
    access_token = get_token()
    return query_reuters_connect(query, access_token)


if __name__ == "__main__":
    query = """
        query Query {
          item(id: "tag:reuters.com,2025:newsml_RW624004032025RP1") {
            associations {
              versionedGuid
              renditions {... on VideoRendition {code uri}
            }}}}"""
    access_token = get_token()
    result = query_reuters_connect(query, access_token)
    for assoc in result['data']['item']['associations']:
        for rend in assoc['renditions']:
            print(rend.get('code'))
