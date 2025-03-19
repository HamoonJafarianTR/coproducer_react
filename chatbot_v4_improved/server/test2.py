import requests
import json
import time
from datetime import datetime, timedelta


# Link for tag:reuters.com,2025:newsml_ROVE18CDF4480:4 and tag:reuters.com,2025:binary_LOV304320022025RP1-STREAM:300:16X9:MP4

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
        expires_in = token_data.get("expires_in")  # Get the expiry time in seconds
        # Calculate the expiry time as a datetime object
        expiry_time = datetime.now() + timedelta(seconds=expires_in - 60)  # Subtract 60 seconds as a buffer
        print(f"Got Production Access Token, Expiry Time: {expiry_time}")
        return access_token, expiry_time
    else:
        print(f"Error: {response.status_code}")
        print(f"Response: {response.text}")
        return None, None


def query_reuters_connect(query, access_token):
    url = "https://api.reutersconnect.com/content/graphql"
    headers = {
        "Authorization": f"Bearer {access_token}",  # Include access token in the header
        "Content-Type": "application/json"
    }
    # Request payload
    payload = {
        "query": query,
        "variables": {}
    }

    # Make the POST request
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    # Check if the request was successful
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(f"Response: {response.text}")
        return None


# Initialize token and expiry time globally, or use a class if you prefer.
_cached_token = None
_token_expiry = None

def graphql_query_production(query):
    global _cached_token, _token_expiry

    if _cached_token is None or datetime.now() >= (_token_expiry or datetime.min):
        _cached_token, _token_expiry = get_token()

    if _cached_token:
      return query_reuters_connect(query, _cached_token)
    else:
       return None


if __name__ == "__main__":
    query = """
        mutation MyMutation {
            download(itemId: "tag:reuters.com,2025:newsml_ROVE18CDF4480:4", renditionId: "tag:reuters.com,2025:binary_LOV304320022025RP1-STREAM:300:16X9:MP4") {
            ... on GenericItem 
        }}"""
    #result = query_reuters_connect(query, access_token) # We don't call this one now
    result = graphql_query_production(query) # using the one that handles expiration
    print(json.dumps(result, indent=2))

    # # Example of how calling it a second time uses the cached token (within the expiry)
    # print("\nCalling the query a second time (testing token caching):\n")
    # result2 = graphql_query_production(query)
    # print(json.dumps(result2, indent=2))

    # # Example of forcing token refresh by setting expiry to the past
    # _token_expiry = datetime.now() - timedelta(seconds=60)
    # print("\nCalling the query a third time (testing token refresh after forced expiry):\n")
    # result3 = graphql_query_production(query)
    # print(json.dumps(result3, indent=2))