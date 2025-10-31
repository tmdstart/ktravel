# User 스키마들
from .user_schema import (
    UserBase,
    UserCreate, 
    UserResponse,
    UserLogin,
    Token,
    TokenData
)

# Destination 스키마들  
from .destination_schema import (
    DestinationBase,
    DestinationCreate,
    DestinationResponse,
    DestinationFromConversation,
    DestinationAddRequest,
    DestinationAddResponse
)

# Conversation 스키마들
from .conversation_schema import (
    ConversationBase,
    ConversationCreate,
    ConversationResponse,
    ChatMessage,
    ChatResponse
)

# Festival 스키마들
from .festival_schema import (
    FestivalBase,
    FestivalResponse,
    FestivalCard,
    MapMarker
)
from .concert_schema import (
    ConcertBase,
    ConcertCreate,
    ConcertUpdate,
    ConcertResponse,
    ConcertSummary,
    ConcertsResponse,
    OngoingConcertsResponse,
    ConcertSearch,
    ConcertDateRange
)

__all__ = [
    # User
    "UserBase", "UserCreate", "UserResponse", 
    "UserLogin", "Token", "TokenData",
    
    # Destination  
    "DestinationBase", "DestinationCreate",
    "DestinationResponse", "DestinationFromConversation",
    "DestinationAddRequest", "DestinationAddResponse",
    
    # Conversation
    "ConversationBase", "ConversationCreate", "ConversationUpdate", 
    "ConversationResponse", "ConversationSummary", "UserConversationsResponse",
    "ChatMessage", "ChatResponse", "ConversationHistory",
    
    # Concert
    "ConcertBase", "ConcertCreate", "ConcertUpdate", "ConcertResponse",
    "ConcertSummary", "ConcertsResponse", "OngoingConcertsResponse",
    "ConcertSearch", "ConcertDateRange",

    
    # Festival
    "FestivalBase", "FestivalResponse", "FestivalCard", "MapMarker"
]

################################################
# 아래는 현재 사용하지 않는 스키마들 (주석 처리됨)

# # User 스키마들 (미사용)
# from .user_schema import (
#     UserUpdate,
#     UserSummary
# )

# # Destination 스키마들 (미사용)
# from .destination_schema import (
#     DestinationUpdate, 
#     DestinationSummary,
#     UserDestinationsResponse,
#     DestinationCreateExtended
# )

# # Conversation 스키마들 (미사용)
# from .conversation_schema import (
#     ConversationUpdate,
#     ConversationSummary,
#     UserConversationsResponse,
#     ConversationHistory
# )

# # Festival 스키마들 (미사용)
# from .festival_schema import (
#     FestivalCreate,
#     FestivalUpdate,
#     FestivalSummary,
#     FestivalsResponse,
#     OngoingFestivalsResponse,
#     FestivalSearch,
#     FestivalDateRange
# )