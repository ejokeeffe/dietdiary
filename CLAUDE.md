# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Build me a local health diary web app in Python with the following spec:

## Overview
A chatbot-style food, drink, and exercise diary that runs locally in the browser. The user types natural language entries describing what they've eaten, drunk, or done for exercise, along with a time. Claude parses these into structured data and stores it in a local SQLite database. A dashboard displays the day's log and nutritional summary.

## Tech Stack
- Backend: Python with Flask (or FastAPI)
- Database: SQLite via SQLAlchemy
- Frontend: Single HTML page served by Flask, using vanilla JS for the chat interface
- AI parsing: Anthropic Python SDK (claude-sonnet-4-20250514) for NLP parsing and nutritional lookup
- Nutritional data: Use Claude to estimate nutritional values (calories, protein, carbs, fat, fibre) from food descriptions — no external API needed

## Core Features

### 1. Chat Input Interface
- A chat-style UI in the browser where users type natural language entries like:
  - "Had a bowl of porridge with banana and honey at 8am"
  - "Drank a large latte around 10:30"
  - "Went for a 5km run at 6pm, took about 28 minutes"
- Include a time picker or allow time to be parsed from the message (default to current time if not mentioned)

### 2. AI Parsing Pipeline
When a message is submitted, send it to Claude with a structured prompt that extracts:
- Entry type: food | drink | exercise
- Time of entry (parsed or current time)
- For food/drink:
  - Item name and description
  - Estimated quantity/portion size
  - Nutritional values: calories (kcal), protein (g), carbohydrates (g), fat (g), fibre (g), sugar (g)
  - Whether it contains alcohol (boolean), and units of alcohol if so
- For exercise:
  - Type of exercise (running, cycling, walking, etc.)
  - Duration (minutes)
  - Distance (if relevant, in km)
  - Estimated calories burned

Return this as structured JSON from Claude.

### 3. Database Schema
Use SQLite with SQLAlchemy. Create tables:
- `diary_entries`: id, date, time, entry_type (food/drink/exercise), raw_input, created_at
- `food_log`: id, entry_id (FK), item_name, quantity, calories, protein, carbs, fat, fibre, sugar, notes
- `drink_log`: id, entry_id (FK), item_name, quantity_ml, calories, is_alcoholic, alcohol_units, notes
- `exercise_log`: id, entry_id (FK), exercise_type, duration_minutes, distance_km, calories_burned, notes

### 4. Dashboard / Log View
Below the chat, show today's log in three sections (Food, Drink, Exercise) with:
- A running total of calories consumed, protein, carbs, fat
- Alcohol units total
- Calories burned from exercise
- Net calories (consumed minus burned)
- Each log entry should be displayed as a card with edit and delete buttons

### 5. Date Navigation
- Default to today's date
- Allow the user to navigate to previous days to view past logs



