import { Controller, Get } from '@nestjs/common';
import { OptionStackAssembler } from '@/application/services/option-hierarchy/csp/types/option-stack.assembler';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';

@Controller('debug')
export class DebugController {
  constructor(private readonly optionStackAssembler: OptionStackAssembler) {}

  @Get('test-assemble')
  testAssemble() {
    const fakeContexts = [
      {
        level: ObjectType.GLOBAL,
        levelId: 1,
        options: [
          {
            code: '1',
            option_code: '1',
            option_value: 'TestValue',
            comment: 'Test option comment',
          },
        ],
        optionGroups: [],
      },
    ];

    const result = this.optionStackAssembler.assemble(fakeContexts);
    return result;
  }
}
