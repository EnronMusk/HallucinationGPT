import { DEFAULT_CHAT_TOOL } from '@/cohere-client';
import { IconName } from '@/components/Shared';
import { useParamsStore } from '@/stores';
import { ConfigurableParams } from '@/stores/slices/paramsSlice';

export enum StartMode {
  UNGROUNDED = 'ungrounded',
  WEB_SEARCH = 'web_search',
  TOOLS = 'tools',
}

type Prompt = {
  title: string;
  description: React.ReactNode;
  icon: IconName;
  prompt: string;
};

type Mode = {
  id: StartMode;
  title: string;
  description: string;
  params: Partial<ConfigurableParams>;
  promptOptions: Prompt[];
  onChange?: VoidFunction;
};

const UNGROUNDED_PROMPTS: Prompt[] = [
  {
    title: 'English to French',
    description: (
      <>
        Create a business plan for a marketing agency in <span className="font-medium">French</span>
      </>
    ),
    icon: 'globe-stand',
    prompt:
      'Write a business plan outline for an marketing agency in French. Highlight all the section titles, and make it less than 300 words.',
  },
  {
    title: 'Multilingual',
    description: 'Redacta una descripción de empleo Diseñador(a) Web',
    icon: 'globe-stand',
    prompt:
      'Redacta una descripción de empleo para la posición de Diseñador(a) Web. Esta descripción debe incluir un segmento detallando las responsabilidades asociadas al puesto, así como 4 puntos destacando los atributos que valoramos en los aspirantes. La lista de cualidades debe seguir el formato: Nombre del atributo: Descripción.',
  },
  {
    title: 'Code Generation',
    description: 'Help me clean up some data in Python',
    icon: 'code',
    prompt: `I want to figure out how to remove nan values from my array. For example, My array looks something like this:
    
        x = [1400, 1500, 1600, nan, nan, nan ,1700] #Not in this exact configuration
            
        How can I remove the nan values from x to get something like:
            
        x = [1400, 1500, 1600, 1700]
    `,
  },
];

const OTHER: Prompt[] = []

const WEB_SEARCH_PROMPTS: Prompt[] = [
  {
    title: 'Code Generation',
    description: 'Help me clean up some data in Python',
    icon: 'code',
    prompt: "I want to figure out how to remove nan values from my array. For example, My array looks something like this:\n\n```python\nx = [1400, 1500, 1600, nan, nan, nan ,1700] #Not in this exact configuration\n```\n\nHow can I remove the nan values from x to get something like:\n\n```python\nx = [1400, 1500, 1600, 1700]\n```",
  },
  {
    title: 'Research',
    description: 'Overview of solar panel industry',
    icon: 'flask',
    prompt: 'What are some cutting edge companies working on solar energy?',
  },
  {
    title: 'Learn a topic',
    description: 'Missions to the moon',
    icon: 'book',
    prompt: `How many missions have there been to the moon?`,
  },
];

export const useStartModes = () => {
  const { params } = useParamsStore();

  const modes: Mode[] = [
    {
      id: StartMode.UNGROUNDED,
      title: 'How to annotate',
      description: 'You can annotate text (*provide comments*) to prompts and model outputs. You can utilize this to help the model produce more accurate results and provide very precise outputs. **Here is how:**\n\n\u200B\n\n1. Simply [H]+x$s^&@2fc856f8-a03d-44bf-a037-c084dd72cd5a@&^s$x+030This is an example annotation!highlight[/H] any text in the conversation, an annotation box will then appear.\n2. Type your comment into the annotation box, **only 1 comment per annotation box is reconmended**.\n3. Click the `+` button to prompt the model, you can add multiple annotations.\n4. Submit the prompt by clicking the `->` button or press `Enter`, thats it!\n\n\u200B\n\nFor the best results we recommend annotating whole sentences, bullet-points, paragraphs or code chunks for large prompts/outputs so the model can more easily identify the area of the highlighted issue.',
      params: { },
      promptOptions: OTHER,
    },
    {
      id: StartMode.WEB_SEARCH,
      title: 'How to chat',
      description: '- Simply type prompts into the prompt container below, or select one of the prompts right here. \n- Your conversations will be automatically saved and can be viewed to the left.\n- You may also modify the titles of conversations to keep track of them, or delete them.',
      params: { fileIds: [], tools: [{ name: DEFAULT_CHAT_TOOL }] },
      promptOptions: WEB_SEARCH_PROMPTS,
    },
  ];

  const getSelectedModeIndex = (): number => {
    let selectedTabKey = StartMode.UNGROUNDED;
    if (params.tools && params.tools.length > 0) {
      selectedTabKey = StartMode.WEB_SEARCH;
    }
    return modes.findIndex((m) => m.id === selectedTabKey);
  };

  return { modes, getSelectedModeIndex };
};
