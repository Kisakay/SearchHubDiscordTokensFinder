# Explanation of How the Program Works

## Overview

This program is designed to identify members of a Discord server who are using message-logging tools by applying a “divide and conquer” technique.

## Detailed Operation

### 1. Initial Setup

* The bot connects to the target Discord server
* It retrieves the full list of all members
* The members are divided into several equal groups (e.g., 1000 members = 5 groups of 200)

### 2. Creating Roles and the Trap Channel

* The bot creates 5 roles corresponding to the 5 groups (Role 1, Role 2, etc.)
* A special channel is created
* By default, all roles are denied permission to view this channel

### 3. Testing Each Group (Loop)

For each group, the following steps are executed:

**Step A: Exposure**

* The targeted group temporarily receives permission to view the channel
* The selfbot sends a unique message with a random code (e.g., “Hello world for group 1 code ABC123”)

### (SearchHub only indexes messages sent by user accounts)

**Step B: External Verification**

* After 5 seconds, the permission is revoked (the group can no longer see the channel)
* The bot queries SearchHub (an external Discord logging service) using a POST request
* It checks whether the message appears in their database

**Step C: Result Analysis**

* If the message does NOT appear: the group is clean, and the program moves on to the next group
* If the message DOES appear: this means at least one member of the group is using a logging tool

### 4. Progressive Narrowing (Dichotomy)

If a group contains a logger:

* The suspicious group is divided into 2 subgroups
* The same testing process is repeated for each subgroup
* The division continues until the exact member responsible is isolated

### 5. Final Action

Once the member is identified with certainty:

* The member is automatically banned from the server

## Detection Principle

The program exploits the fact that logging tools send messages to third-party services (like SearchHub).
By sending messages visible only to specific groups and checking whether those messages appear in such services, it can infer which member is using these tools.