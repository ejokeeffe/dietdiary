from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent
from langchain_anthropic import ChatAnthropic
from config import settings

_agent_executor = None


def get_agent():
    global _agent_executor
    if _agent_executor is None:
        db = SQLDatabase.from_uri(settings.DATABASE_URL)
        llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            api_key=settings.ANTHROPIC_API_KEY,
        )
        _agent_executor = create_sql_agent(
            llm,
            db=db,
            agent_type="tool-calling",
            verbose=False,
        )
    return _agent_executor


def query_diary(question: str, profile_id: int | None = None) -> str:
    agent = get_agent()
    scoped = f"[Restrict all queries to diary_entries rows where profile_id = {profile_id}] {question}" if profile_id else question
    result = agent.invoke({"input": scoped})
    return result["output"]
